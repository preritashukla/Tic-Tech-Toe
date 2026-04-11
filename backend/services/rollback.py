"""
services/rollback.py — Saga-Pattern Automatic Rollback Engine

Implements compensating transactions for multi-step workflows.
When a node fails, all previously completed nodes are rolled back
in REVERSE topological order using compensating actions.

Design Principles:
1. REVERSE ORDER — Undo last-completed first
2. BEST-EFFORT — If a compensating action fails, log it and continue
3. SKIP DESTRUCTIVE — merge_pr and send_message are NEVER auto-rolled-back
4. AUDIT EVERYTHING — Every rollback attempt is logged
5. IDEMPOTENT — Safe to call rollback multiple times

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import asyncio
import logging
import time
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger("mcp_gateway.rollback")


# ─── Rollback Journal Entry ────────────────────────────────────────

@dataclass
class RollbackJournalEntry:
    """Tracks what needs to be undone for a single completed node."""
    execution_id: str
    node_id: str
    tool: str
    action: str
    compensating_action: str            # e.g. "delete_branch"
    compensating_params: dict           # Params needed for the undo
    original_params: dict               # Original input params (for audit)
    original_output: dict               # What the original action returned
    status: str = "pending"             # pending / executed / failed / skipped
    error: Optional[str] = None         # Error if rollback failed
    executed_at: Optional[str] = None   # Timestamp of rollback execution


@dataclass
class RollbackResult:
    """Summary of a rollback operation."""
    execution_id: str
    total_entries: int = 0
    succeeded: int = 0
    failed: int = 0
    skipped: int = 0
    entries: list[dict] = field(default_factory=list)
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "execution_id": self.execution_id,
            "total_entries": self.total_entries,
            "succeeded": self.succeeded,
            "failed": self.failed,
            "skipped": self.skipped,
            "entries": self.entries,
            "started_at": self.started_at,
            "completed_at": self.completed_at
        }


# ─── Compensating Action Definitions ──────────────────────────────

def _build_delete_branch_params(params: dict, output: dict) -> dict:
    """Build params to delete a branch created by create_branch."""
    return {
        "owner": params.get("owner", ""),
        "repo": params.get("repo", ""),
        "branch_name": output.get("branch_name") or params.get("branch_name", ""),
        # Pass through repo resolution keys
        "repo_full_name": params.get("repo_full_name", ""),
        "full_name": params.get("full_name", ""),
        "repository": params.get("repository", ""),
        "repo_name": params.get("repo_name", ""),
    }


def _build_close_pr_params(params: dict, output: dict) -> dict:
    """Build params to close a PR created by create_pull_request."""
    return {
        "owner": params.get("owner", ""),
        "repo": params.get("repo", ""),
        "pr_number": output.get("pr_number") or params.get("pr_number", 0),
        "repo_full_name": params.get("repo_full_name", ""),
        "full_name": params.get("full_name", ""),
        "repository": params.get("repository", ""),
        "repo_name": params.get("repo_name", ""),
    }


def _build_close_issue_params(params: dict, output: dict) -> dict:
    """Build params to close an issue created by create_issue."""
    return {
        "owner": params.get("owner", ""),
        "repo": params.get("repo", ""),
        "issue_number": output.get("issue_number") or params.get("issue_number", 0),
        "repo_full_name": params.get("repo_full_name", ""),
        "full_name": params.get("full_name", ""),
        "repository": params.get("repository", ""),
        "repo_name": params.get("repo_name", ""),
    }


def _build_cancel_jira_params(params: dict, output: dict) -> dict:
    """Build params to cancel a Jira issue."""
    return {
        "issue_id": output.get("key") or output.get("issue_id") or params.get("issue_id", ""),
        "status": "Cancelled",
    }


def _build_restore_jira_params(params: dict, output: dict) -> dict:
    """Build params to restore a Jira issue's original state."""
    return {
        "issue_id": params.get("issue_id") or params.get("ticket_id", ""),
        # Original state should be captured in the snapshot
        "status": output.get("_original_status", params.get("_original_status")),
        "summary": output.get("_original_summary"),
    }


def _build_archive_channel_params(params: dict, output: dict) -> dict:
    """Build params to archive a Slack channel."""
    channel_id = None
    if isinstance(output, dict):
        out_data = output.get("output", output)
        if isinstance(out_data, dict):
            channel = out_data.get("channel", {})
            channel_id = channel.get("id") if isinstance(channel, dict) else None
    return {
        "channel_id": channel_id or params.get("channel_id", ""),
    }


# Compensating action registry
# Key: (tool, action) → value: {compensating_action, auto, param_builder}
COMPENSATING_ACTIONS: dict[tuple[str, str], dict] = {
    # ── GitHub ──────────────────────────────────────────────
    ("github", "create_branch"): {
        "action": "delete_branch",
        "auto": True,
        "param_builder": _build_delete_branch_params,
    },
    ("github", "create_pull_request"): {
        "action": "close_pull_request",
        "auto": True,
        "param_builder": _build_close_pr_params,
    },
    ("github", "create_issue"): {
        "action": "close_issue",
        "auto": True,
        "param_builder": _build_close_issue_params,
    },
    ("github", "merge_pull_request"): {
        "action": None,
        "auto": False,  # NEVER auto-rollback merges
        "param_builder": lambda p, o: {},
    },
    ("github", "add_labels"): {
        "action": None,
        "auto": False,  # Labels are informational
        "param_builder": lambda p, o: {},
    },
    ("github", "add_issue_comment"): {
        "action": None,
        "auto": False,  # Comments are informational
        "param_builder": lambda p, o: {},
    },
    ("github", "create_or_update_file"): {
        "action": None,
        "auto": False,  # File changes need manual review
        "param_builder": lambda p, o: {},
    },

    # ── Jira ────────────────────────────────────────────────
    ("jira", "create_issue"): {
        "action": "update_issue",
        "auto": True,
        "param_builder": _build_cancel_jira_params,
    },
    ("jira", "create_ticket"): {
        "action": "update_ticket",
        "auto": True,
        "param_builder": _build_cancel_jira_params,
    },
    ("jira", "update_issue"): {
        "action": "update_issue",
        "auto": True,
        "param_builder": _build_restore_jira_params,
    },
    ("jira", "update_ticket"): {
        "action": "update_ticket",
        "auto": True,
        "param_builder": _build_restore_jira_params,
    },

    # ── Slack ───────────────────────────────────────────────
    ("slack", "send_message"): {
        "action": None,
        "auto": False,  # Can't un-send messages
        "param_builder": lambda p, o: {},
    },
    ("slack", "create_channel"): {
        "action": "archive_channel",
        "auto": True,
        "param_builder": _build_archive_channel_params,
    },

    # ── Sheets ──────────────────────────────────────────────
    ("sheets", "append_row"): {
        "action": None,
        "auto": False,  # Row position may have shifted
        "param_builder": lambda p, o: {},
    },
    ("sheets", "update_row"): {
        "action": None,
        "auto": False,  # Need original values
        "param_builder": lambda p, o: {},
    },
}


class RollbackEngine:
    """
    Saga-pattern compensating transaction engine.
    
    Records compensating actions as nodes succeed, then executes them
    in reverse order when a failure triggers automatic rollback.
    """

    def __init__(self):
        # execution_id → list of journal entries (ordered by completion)
        self._journals: dict[str, list[RollbackJournalEntry]] = {}

    def record_compensating_action(
        self,
        execution_id: str,
        node_id: str,
        tool: str,
        action: str,
        params: dict,
        output: dict
    ) -> Optional[RollbackJournalEntry]:
        """
        Record a compensating action for a successfully completed node.
        Called after each node succeeds during normal execution.
        
        Returns the journal entry if a compensating action exists, None otherwise.
        """
        # Normalize tool name (strip _mcp suffix)
        tool_key = tool.replace("_mcp", "").lower()
        action_key = action.lower()

        comp = COMPENSATING_ACTIONS.get((tool_key, action_key))
        if not comp or not comp["action"]:
            logger.debug(
                f"[{execution_id}] No compensating action for {tool_key}.{action_key}"
            )
            return None

        try:
            comp_params = comp["param_builder"](params, output)
        except Exception as e:
            logger.warning(
                f"[{execution_id}] Failed to build compensating params for "
                f"{tool_key}.{action_key}: {e}"
            )
            return None

        entry = RollbackJournalEntry(
            execution_id=execution_id,
            node_id=node_id,
            tool=tool_key,
            action=action_key,
            compensating_action=comp["action"],
            compensating_params=comp_params,
            original_params=params,
            original_output=output if isinstance(output, dict) else {"raw": str(output)},
        )

        if execution_id not in self._journals:
            self._journals[execution_id] = []
        self._journals[execution_id].append(entry)

        logger.info(
            f"[{execution_id}] Recorded rollback: {tool_key}.{action_key} "
            f"→ {comp['action']} for node {node_id}"
        )
        return entry

    async def execute_rollback(
        self,
        execution_id: str,
        mcp_dispatcher: Callable,
        from_node_id: Optional[str] = None
    ) -> RollbackResult:
        """
        Execute all pending rollback entries in reverse order.
        
        Args:
            execution_id: The execution to rollback
            mcp_dispatcher: The MCP dispatch function (tool, action, params) → dict
            from_node_id: Optional — only rollback from this node backward
        
        Returns:
            RollbackResult with details of each rollback attempt
        """
        entries = self._journals.get(execution_id, [])
        if not entries:
            logger.info(f"[{execution_id}] No rollback entries found")
            return RollbackResult(execution_id=execution_id)

        # If from_node_id specified, only rollback up to that node
        if from_node_id:
            target_idx = None
            for i, e in enumerate(entries):
                if e.node_id == from_node_id:
                    target_idx = i
                    break
            if target_idx is not None:
                entries = entries[:target_idx + 1]

        # REVERSE ORDER — undo last-completed first
        entries = list(reversed(entries))

        result = RollbackResult(
            execution_id=execution_id,
            total_entries=len(entries)
        )

        logger.info(
            f"[{execution_id}] Starting rollback: {len(entries)} entries to process"
        )

        for entry in entries:
            if entry.status != "pending":
                result.skipped += 1
                result.entries.append({
                    "node_id": entry.node_id,
                    "status": entry.status,
                    "reason": f"Already {entry.status}"
                })
                continue

            # Check if this action should be auto-rolled-back
            comp = COMPENSATING_ACTIONS.get((entry.tool, entry.action))
            if not comp or not comp.get("auto", False):
                entry.status = "skipped"
                result.skipped += 1
                reason = (
                    f"{entry.tool}.{entry.action} is not safe for auto-rollback "
                    f"(requires manual intervention)"
                )
                result.entries.append({
                    "node_id": entry.node_id,
                    "tool": entry.tool,
                    "action": entry.action,
                    "status": "skipped",
                    "reason": reason
                })
                logger.warning(f"[{execution_id}] Skipped rollback of {entry.node_id}: {reason}")
                continue

            # Execute compensating action
            try:
                logger.info(
                    f"[{execution_id}] Rolling back {entry.node_id}: "
                    f"{entry.tool}.{entry.compensating_action}"
                )

                # Use the same MCP dispatcher as normal execution
                rollback_output = await mcp_dispatcher(
                    entry.tool + "_mcp",   # Re-add _mcp suffix for dispatcher
                    entry.compensating_action,
                    entry.compensating_params
                )

                entry.status = "executed"
                entry.executed_at = datetime.now(timezone.utc).isoformat()
                result.succeeded += 1
                result.entries.append({
                    "node_id": entry.node_id,
                    "tool": entry.tool,
                    "action": entry.compensating_action,
                    "status": "executed",
                    "output": rollback_output
                })

                logger.info(
                    f"[{execution_id}] ✅ Rolled back {entry.node_id} successfully"
                )

                # Small delay between rollback actions to avoid rate limits
                await asyncio.sleep(0.5)

            except Exception as e:
                entry.status = "failed"
                entry.error = str(e)
                entry.executed_at = datetime.now(timezone.utc).isoformat()
                result.failed += 1
                result.entries.append({
                    "node_id": entry.node_id,
                    "tool": entry.tool,
                    "action": entry.compensating_action,
                    "status": "failed",
                    "error": str(e)
                })

                logger.error(
                    f"[{execution_id}] ❌ Rollback FAILED for {entry.node_id}: {e}"
                )
                # Continue with remaining rollbacks — don't stop on failure

        result.completed_at = datetime.now(timezone.utc).isoformat()

        logger.info(
            f"[{execution_id}] Rollback complete: "
            f"{result.succeeded} succeeded, {result.failed} failed, "
            f"{result.skipped} skipped out of {result.total_entries}"
        )

        return result

    def get_journal(self, execution_id: str) -> list[dict]:
        """Get the rollback journal for an execution."""
        entries = self._journals.get(execution_id, [])
        return [
            {
                "node_id": e.node_id,
                "tool": e.tool,
                "action": e.action,
                "compensating_action": e.compensating_action,
                "compensating_params": e.compensating_params,
                "status": e.status,
                "error": e.error,
                "executed_at": e.executed_at,
            }
            for e in entries
        ]

    def has_entries(self, execution_id: str) -> bool:
        """Check if an execution has any rollback journal entries."""
        return bool(self._journals.get(execution_id))

    def clear_journal(self, execution_id: str) -> None:
        """Clear the rollback journal for an execution."""
        self._journals.pop(execution_id, None)


# ─── Global singleton ──────────────────────────────────────────────
_rollback_engine: Optional[RollbackEngine] = None


def get_rollback_engine() -> RollbackEngine:
    """Singleton accessor for the rollback engine."""
    global _rollback_engine
    if _rollback_engine is None:
        _rollback_engine = RollbackEngine()
    return _rollback_engine
