"""
services/context.py — Context Management System
Maintains state across multi-turn interactions and cross-node data flow.
Resolves {{node_X.output.field}} templates with actual runtime values.

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import json
import re
import logging
from typing import Any, Optional

logger = logging.getLogger("mcp_gateway.context")


class ContextManager:
    """
    Manages execution context across DAG node executions.
    
    Responsibilities:
    1. Store outputs from completed nodes
    2. Resolve template references ({{node_X.output.field}}) in params
    3. Track conversation state across multi-turn interactions
    4. Handle large payloads via summarization threshold
    
    Compatible with both Prerita's template format ({{node_1.field_name}})
    and Grishma's executor format ({{task_1.output.field}}).
    """

    def __init__(self, summarize_threshold: int = 2000):
        self._node_outputs: dict[str, dict[str, Any]] = {}
        self._conversation_history: list[dict] = []
        self._execution_metadata: dict[str, Any] = {}
        self._summarize_threshold = summarize_threshold
        # Regex patterns for template resolution
        # Supports: {{node_1.output.field}}, {{task_1.output.field}}, {{node_1.field}}
        self._template_pattern = re.compile(
            r"\{\{(\w+)(?:\.output)?\.(\w+)\}\}"
        )

    # ─── Node Output Management ────────────────────────────────────

    def store(self, node_id: str, output: dict[str, Any]) -> None:
        """
        Store the output of a completed node for downstream template resolution.
        If output exceeds threshold, mark it for summarization.
        """
        if not isinstance(output, dict):
            output = {"result": output}

        self._node_outputs[node_id] = output
        output_size = len(json.dumps(output))
        logger.info(
            f"Stored output for {node_id} ({output_size} chars, "
            f"{'needs summarization' if output_size > self._summarize_threshold else 'ok'})"
        )

    def get_output(self, node_id: str) -> Optional[dict[str, Any]]:
        """Retrieve stored output for a specific node."""
        return self._node_outputs.get(node_id)

    def has_output(self, node_id: str) -> bool:
        """Check if a node has stored output."""
        return node_id in self._node_outputs

    # ─── Template Resolution ───────────────────────────────────────

    def resolve_params(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Replace {{node_X.output.field}} or {{node_X.field}} templates 
        with actual values from stored node outputs.
        
        Handles:
        - String values with embedded templates
        - Nested dict values (recursive resolution)
        - Templates within list items
        
        Args:
            params: Raw params dict potentially containing template references
            
        Returns:
            Fully resolved params dict with actual values
            
        Raises:
            ValueError: If a referenced node or field doesn't exist
        """
        return self._resolve_value(params)

    def _resolve_value(self, value: Any) -> Any:
        """Recursively resolve templates in any value type."""
        if isinstance(value, str):
            return self._resolve_string(value)
        elif isinstance(value, dict):
            return {k: self._resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._resolve_value(item) for item in value]
        return value

    def _resolve_string(self, text: str) -> str:
        """
        Resolve all template references in a string.
        Supports templates embedded within longer strings.
        """
        def replacer(match: re.Match) -> str:
            node_id = match.group(1)
            field = match.group(2)

            if node_id not in self._node_outputs:
                raise ValueError(
                    f"Template resolution failed: node '{node_id}' not found in completed outputs. "
                    f"Available: {list(self._node_outputs.keys())}"
                )

            output = self._node_outputs[node_id]
            if field not in output:
                raise ValueError(
                    f"Template resolution failed: field '{field}' not found in {node_id}.output. "
                    f"Available fields: {list(output.keys())}"
                )

            return str(output[field])

        return self._template_pattern.sub(replacer, text)

    # ─── Conversation State (Multi-turn) ───────────────────────────

    def add_turn(self, role: str, content: str, metadata: Optional[dict] = None) -> None:
        """Record a conversation turn for multi-turn context."""
        self._conversation_history.append({
            "role": role,
            "content": content,
            "metadata": metadata or {}
        })

    def get_conversation_context(self, max_turns: int = 10) -> list[dict]:
        """Get recent conversation history for LLM context window."""
        return self._conversation_history[-max_turns:]

    # ─── Execution Metadata ────────────────────────────────────────

    def set_metadata(self, key: str, value: Any) -> None:
        """Store execution-level metadata (workflow_id, timestamps, etc.)."""
        self._execution_metadata[key] = value

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Retrieve execution metadata."""
        return self._execution_metadata.get(key, default)

    # ─── Large Payload Handling ────────────────────────────────────

    def needs_summarization(self, node_id: str) -> bool:
        """Check if a node's output exceeds the summarization threshold."""
        output = self._node_outputs.get(node_id)
        if not output:
            return False
        return len(json.dumps(output)) > self._summarize_threshold

    def store_summarized(self, node_id: str, summary: dict[str, Any]) -> None:
        """Replace a node's full output with a summarized version."""
        if node_id in self._node_outputs:
            self._node_outputs[node_id] = summary
            logger.info(f"Replaced {node_id} output with summarized version")

    # ─── Snapshot & Debug ──────────────────────────────────────────

    def get_execution_context(self) -> dict[str, Any]:
        """Return full context snapshot for debugging/observability."""
        return {
            "node_outputs": {
                nid: {
                    "data": output,
                    "size_chars": len(json.dumps(output))
                }
                for nid, output in self._node_outputs.items()
            },
            "conversation_turns": len(self._conversation_history),
            "metadata": self._execution_metadata,
            "total_stored_nodes": len(self._node_outputs)
        }

    def clear(self) -> None:
        """Reset all state for a fresh execution."""
        self._node_outputs.clear()
        self._conversation_history.clear()
        self._execution_metadata.clear()
        logger.info("Context manager cleared")
