"""
services/session.py — Conversation Session Manager
Implements ChatGPT-like multi-turn conversation memory for the Agentic MCP Gateway.

Each session tracks:
- Full message history (user, assistant, system messages)
- Most recent DAG (for follow-up modifications)
- Execution history (for "what happened?" queries)
- Auto-summarization of old turns (context window management)

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("mcp_gateway.session")


# ─── Constants ─────────────────────────────────────────────────────
MAX_RECENT_TURNS = 8          # Keep last N turns verbatim; older ones get summarized
SESSION_TTL_SECONDS = 4 * 3600  # 4 hours
MAX_MESSAGE_CHARS = 4000       # Truncate individual messages beyond this


@dataclass
class ConversationMessage:
    """A single message in the conversation thread."""
    role: str               # "user" | "assistant" | "system"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict = field(default_factory=dict)
    # metadata can contain: dag_json, execution_id, node_count, etc.


class ConversationSession:
    """
    One user's ongoing conversation thread.
    
    Maintains full history with smart context window management:
    - Recent turns (last MAX_RECENT_TURNS) are kept verbatim
    - Older turns are compressed into a summary via LLM
    - Execution outcomes are injected as system messages
    """

    def __init__(self, session_id: Optional[str] = None):
        self.session_id: str = session_id or f"sess-{uuid.uuid4().hex[:12]}"
        self.messages: list[ConversationMessage] = []
        self.last_dag: Optional[Any] = None          # Most recent WorkflowDAG
        self.last_dag_json: Optional[dict] = None     # Serialized DAG for LLM context
        self.last_execution_id: Optional[str] = None
        self.execution_history: list[dict] = []       # [{exec_id, status, workflow_name, ts}]
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.last_active_at: float = time.time()
        self.summary: Optional[str] = None            # LLM-generated summary of old turns
        self._summary_cutoff: int = 0                 # Index up to which messages are summarized

    @property
    def turn_count(self) -> int:
        """Number of user messages in the session."""
        return sum(1 for m in self.messages if m.role == "user")

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.last_active_at) > SESSION_TTL_SECONDS

    def touch(self) -> None:
        """Update last activity timestamp."""
        self.last_active_at = time.time()

    def add_message(self, role: str, content: str, metadata: Optional[dict] = None) -> None:
        """Add a message to the conversation history."""
        # Truncate extremely long messages to prevent memory bloat
        if len(content) > MAX_MESSAGE_CHARS:
            content = content[:MAX_MESSAGE_CHARS] + "\n...[truncated]"

        self.messages.append(ConversationMessage(
            role=role,
            content=content,
            metadata=metadata or {}
        ))
        self.touch()
        logger.debug(
            f"[{self.session_id}] Added {role} message "
            f"({len(content)} chars, total: {len(self.messages)} messages)"
        )

    def add_execution_feedback(self, execution_id: str, results: dict) -> None:
        """
        Inject execution outcome as a system message.
        This lets the LLM know what happened so it can handle follow-ups like
        "retry that", "why did it fail?", "fix the Slack step".
        """
        self.last_execution_id = execution_id
        self.execution_history.append({
            "execution_id": execution_id,
            "status": results.get("status", "unknown"),
            "succeeded": results.get("succeeded", 0),
            "failed": results.get("failed", 0),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # Build a concise feedback message for the LLM
        status = results.get("status", "unknown")
        succeeded = results.get("succeeded", 0)
        failed = results.get("failed", 0)
        total = succeeded + failed + results.get("skipped", 0)

        feedback_parts = [
            f"[EXECUTION RESULT] Workflow {execution_id}: {status}.",
            f"{succeeded}/{total} nodes succeeded.",
        ]

        # Include error details for failed nodes
        node_errors = results.get("node_errors", {})
        if node_errors:
            feedback_parts.append("Failed nodes:")
            for node_id, error in node_errors.items():
                feedback_parts.append(f"  - {node_id}: {error}")

        # Include rollback info if present
        rollback = results.get("rollback")
        if rollback:
            feedback_parts.append(
                f"Auto-rollback: {rollback.get('rolled_back', 0)} nodes rolled back, "
                f"{rollback.get('failed_rollbacks', 0)} rollback failures."
            )

        feedback_msg = "\n".join(feedback_parts)
        self.add_message("system", feedback_msg, metadata={
            "type": "execution_feedback",
            "execution_id": execution_id
        })

    def edit_from(self, message_index: int) -> None:
        """
        Discard all messages after the given index (edit/regeneration support).
        Matches the frontend behavior of slicing messages on edit.
        """
        if 0 <= message_index < len(self.messages):
            discarded = len(self.messages) - message_index
            self.messages = self.messages[:message_index]
            # Reset DAG context since the conversation changed
            self.last_dag = None
            self.last_dag_json = None
            logger.info(
                f"[{self.session_id}] Edit from index {message_index}: "
                f"discarded {discarded} messages"
            )

    def get_recent_messages(self) -> list[ConversationMessage]:
        """Get the most recent messages (after the summarized portion)."""
        return self.messages[self._summary_cutoff:]

    def get_messages_for_llm(self) -> list[dict]:
        """
        Build the full messages[] array for the LLM API call.
        
        Strategy:
        1. If we have a summary of old turns → inject it as a system message
        2. Recent messages (last MAX_RECENT_TURNS * 2 individual messages) → verbatim
        3. If last_dag exists → inject it so LLM can reference/modify it
        
        Returns list of {role, content} dicts ready for Groq API.
        """
        llm_messages = []

        # 1. Inject summary of old turns if available
        if self.summary:
            llm_messages.append({
                "role": "system",
                "content": (
                    f"[CONVERSATION CONTEXT] Summary of earlier messages in this session:\n"
                    f"{self.summary}"
                )
            })

        # 2. Inject recent messages verbatim
        recent = self.get_recent_messages()
        for msg in recent:
            llm_messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # 3. If we have a last DAG and the most recent message is from user,
        #    inject the DAG as context so the LLM can modify it
        if self.last_dag_json and recent:
            last_user_msgs = [m for m in recent if m.role == "user"]
            if last_user_msgs:
                last_content = last_user_msgs[-1].content.lower()
                # Detect follow-up / modification intent
                follow_up_signals = [
                    "change", "modify", "update", "add", "also", "retry",
                    "fix", "redo", "again", "instead", "replace", "remove",
                    "delete", "switch", "use", "but", "adjust", "tweak",
                    "what happened", "show result", "status", "rollback"
                ]
                if any(signal in last_content for signal in follow_up_signals):
                    # Inject the current DAG so LLM can modify it
                    dag_ctx = json.dumps(self.last_dag_json, indent=2)
                    if len(dag_ctx) > 3000:
                        # Compress large DAGs
                        dag_ctx = json.dumps({
                            "workflow_name": self.last_dag_json.get("workflow_name"),
                            "nodes": [
                                {"id": n["id"], "tool": n["tool"], "action": n["action"],
                                 "params": n.get("params", {}), "depends_on": n.get("depends_on", [])}
                                for n in self.last_dag_json.get("nodes", [])
                            ]
                        }, indent=2)

                    llm_messages.insert(-1, {  # Insert before the last user message
                        "role": "system",
                        "content": (
                            f"[CURRENT WORKFLOW] The user's most recent DAG is:\n"
                            f"```json\n{dag_ctx}\n```\n"
                            f"The user may want to MODIFY this workflow. "
                            f"Make targeted changes rather than rebuilding from scratch."
                        )
                    })

        return llm_messages

    def needs_summarization(self) -> bool:
        """Check if older messages should be summarized to save context window."""
        unsummarized_count = len(self.messages) - self._summary_cutoff
        return unsummarized_count > (MAX_RECENT_TURNS * 2 + 4)

    def mark_summarized(self, summary: str, up_to_index: int) -> None:
        """Store LLM-generated summary and mark messages as summarized."""
        self.summary = summary
        self._summary_cutoff = up_to_index
        logger.info(
            f"[{self.session_id}] Summarized {up_to_index} messages into "
            f"{len(summary)} char summary"
        )

    def to_dict(self) -> dict:
        """Serialize session for API responses."""
        return {
            "session_id": self.session_id,
            "turn_count": self.turn_count,
            "message_count": len(self.messages),
            "last_dag": self.last_dag_json is not None,
            "last_execution_id": self.last_execution_id,
            "execution_count": len(self.execution_history),
            "created_at": self.created_at,
            "has_summary": self.summary is not None,
        }


class SessionManager:
    """
    In-memory session store with TTL-based auto-cleanup.
    
    Thread-safe singleton — all request handlers share the same instance.
    Sessions expire after SESSION_TTL_SECONDS of inactivity.
    """

    def __init__(self):
        self._sessions: dict[str, ConversationSession] = {}
        self._last_cleanup: float = time.time()
        logger.info("SessionManager initialized")

    def get_or_create(self, session_id: Optional[str] = None) -> ConversationSession:
        """Get existing session or create a new one."""
        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            if not session.is_expired:
                session.touch()
                return session
            else:
                # Session expired, remove it
                logger.info(f"Session {session_id} expired, creating new")
                del self._sessions[session_id]

        # Create new session
        session = ConversationSession(session_id=session_id)
        self._sessions[session.session_id] = session
        logger.info(f"Created new session: {session.session_id}")

        # Periodic cleanup
        self._maybe_cleanup()
        return session

    def get(self, session_id: str) -> Optional[ConversationSession]:
        """Get session by ID, or None if not found/expired."""
        session = self._sessions.get(session_id)
        if session and not session.is_expired:
            return session
        return None

    def delete(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session: {session_id}")
            return True
        return False

    def get_active_sessions(self) -> list[dict]:
        """List all active (non-expired) sessions."""
        self._maybe_cleanup()
        return [
            s.to_dict() for s in self._sessions.values()
            if not s.is_expired
        ]

    def get_session_count(self) -> int:
        """Get count of active sessions."""
        return sum(1 for s in self._sessions.values() if not s.is_expired)

    def _maybe_cleanup(self) -> None:
        """Remove expired sessions periodically (every 5 minutes)."""
        now = time.time()
        if now - self._last_cleanup < 300:  # 5 minutes
            return

        expired = [
            sid for sid, s in self._sessions.items()
            if s.is_expired
        ]
        for sid in expired:
            del self._sessions[sid]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")
        self._last_cleanup = now


# ─── Global singleton ──────────────────────────────────────────────
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Singleton accessor for the session manager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
