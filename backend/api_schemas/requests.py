"""
models/requests.py — API Request/Response Schemas
Defines the FastAPI endpoint contracts for /plan and /execute.

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from .dag import WorkflowDAG


# ─── Plan Endpoint ──────────────────────────────────────────────────

class PlanRequest(BaseModel):
    """POST /plan — request body."""
    user_input: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Natural language workflow description",
        json_schema_extra={"examples": [
            "Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"
        ]}
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Conversation session ID for multi-turn context. If omitted, a new session is created."
    )
    edit_index: Optional[int] = Field(
        default=None,
        description="If editing a previous message, the index to discard messages after (edit/regeneration support)"
    )
    context: Optional[dict[str, Any]] = Field(
        default=None,
        description="Optional context from previous interactions"
    )


class PlanResponse(BaseModel):
    """POST /plan — response body."""
    success: bool = Field(..., description="Whether DAG generation succeeded")
    dag: Optional[WorkflowDAG] = Field(default=None, description="Generated workflow DAG")
    raw_llm_output: Optional[str] = Field(default=None, description="Raw LLM response for debugging")
    errors: list[str] = Field(default_factory=list, description="Validation or generation errors")
    attempts: int = Field(default=1, description="Number of LLM attempts made")
    model_used: str = Field(default="llama-3.3-70b-versatile", description="LLM model used")
    session_id: Optional[str] = Field(default=None, description="Conversation session ID for multi-turn follow-ups")


# ─── Execute Endpoint ───────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    """POST /execute — request body."""
    dag: WorkflowDAG = Field(..., description="The DAG to execute")
    session_id: Optional[str] = Field(
        default=None,
        description="Conversation session ID — execution results are injected as feedback"
    )
    auto_approve: bool = Field(
        default=True,
        description="If True, skip HITL approval gates (demo mode)"
    )
    dry_run: bool = Field(
        default=False,
        description="If True, simulate execution without calling real tools"
    )
    rollback_policy: str = Field(
        default="auto",
        description="Rollback policy on failure: 'auto' (rollback on any failure), 'manual' (user triggers), 'none' (no rollback)"
    )
    credentials: Optional[dict[str, Any]] = Field(
        default=None,
        description="User-specific credentials from the ConnectTools dashboard"
    )


class ExecuteResponse(BaseModel):
    """POST /execute — final response (non-streaming)."""
    execution_id: str
    success: bool
    total_nodes: int
    succeeded: int
    failed: int
    skipped: int
    results: list[dict[str, Any]] = Field(default_factory=list)
    audit_log: list[dict[str, Any]] = Field(default_factory=list)


# ─── Health Endpoint ────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """GET /health — response body."""
    status: str = "healthy"
    version: str = "1.0.0"
    llm_model: str = ""
    services: dict[str, str] = Field(default_factory=dict)
