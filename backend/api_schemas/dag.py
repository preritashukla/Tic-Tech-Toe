"""
models/dag.py — Pydantic DAG Schema
Defines the contract between LLM Planner ↔ Execution Engine ↔ Frontend.
Validates LLM output into a structured, type-safe DAG.

Author: Shivam Kumar (LLM Systems Developer)
Integrates: Prerita Shukla's prompt schema (tool/action/params/depends_on)
"""

from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Retry Configuration ───────────────────────────────────────────
class RetryConfig(BaseModel):
    """Per-node retry policy with exponential backoff."""
    max_attempts: int = Field(default=3, ge=1, le=10)
    backoff_factor: float = Field(default=2.0, ge=1.0)
    initial_delay: float = Field(default=1.0, ge=0.1)
    timeout: int = Field(default=10, ge=1, description="Per-attempt timeout in seconds")


# ─── Valid Tools & Actions ───────────────────────────────────────────
VALID_TOOLS: dict[str, set[str]] = {
    "jira":    {"get_issue", "create_issue", "update_issue"},
    "github":  {
        "get_repository", "list_branches", "create_branch", "get_branch",
        "list_issues", "get_issue", "create_issue", "add_issue_comment",
        "update_issue", "create_pull_request", "list_pull_requests", 
        "get_pull_request", "merge_pull_request", "add_labels",
        "get_file_content", "create_or_update_file", "list_commits", "create_release"
    },
    "slack":   {"send_message", "send_file", "create_channel"},
    "sheets":  {"read_row", "update_row", "append_row"},
    # MCP-suffixed versions
    "jira_mcp":    {"create_ticket", "get_issue", "update_issue", "create_issue"},
    "github_mcp":  {
        "get_repository", "list_branches", "create_branch", "get_branch",
        "list_issues", "get_issue", "create_issue", "add_issue_comment",
        "update_issue", "create_pull_request", "list_pull_requests", 
        "get_pull_request", "merge_pull_request", "add_labels",
        "get_file_content", "create_or_update_file", "list_commits", "create_release",
        "link_issue"
    },
    "slack_mcp":   {"send_message", "send_file", "create_channel", "post_message"},
    "sheets_mcp":  {"read_row", "update_row", "append_row"},
}


# ─── DAG Node ───────────────────────────────────────────────────────
class DAGNode(BaseModel):
    """A single step in the workflow DAG."""
    id: str = Field(..., description="Unique node identifier, e.g. 'node_1' or 'task_1'")
    tool: str = Field(..., description="Target MCP tool: jira, github, slack, sheets")
    action: str = Field(..., description="Tool-specific action to invoke")
    params: dict[str, Any] = Field(default_factory=dict, description="Action parameters, may contain {{template}} refs")
    depends_on: list[str] = Field(default_factory=list, description="IDs of upstream dependency nodes")
    requires_approval: bool = Field(default=False, description="Whether this node needs HITL approval")
    retry: RetryConfig = Field(default_factory=RetryConfig)

    # Optional fields for enriched DAGs
    name: Optional[str] = Field(default=None, description="Human-readable step name")
    mock_output: Optional[dict[str, Any]] = Field(default=None, description="Mock output for demo/testing")
    timeout_ms: Optional[int] = Field(default=None, description="Per-node timeout in milliseconds")

    @field_validator("tool")
    @classmethod
    def validate_tool(cls, v: str) -> str:
        if v not in VALID_TOOLS:
            raise ValueError(f"Unknown tool '{v}'. Must be one of: {list(VALID_TOOLS.keys())}")
        return v

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str, info) -> str:
        # Transparently map common LLM hallucinations and aliases to the canonical actions
        aliases = {
            "post_message": "send_message",
            "notify": "send_message",
            "send": "send_message",
            "get_ticket": "get_issue",
            "get_issues": "get_issue",
            "get_tickets": "get_issue",
            "create_ticket": "create_issue",
            "update_ticket": "update_issue",
            "get_repo": "get_repository",
            "get_commits": "list_commits",
            "create_pr": "create_pull_request",
            "merge_pr": "merge_pull_request",
            "write_row": "append_row",
            "add_row": "append_row",
            "log_row": "append_row",
        }
        return aliases.get(v, v)

    @model_validator(mode="after")
    def validate_tool_action_pair(self) -> "DAGNode":
        tool = self.tool
        action = self.action
        if tool in VALID_TOOLS and action not in VALID_TOOLS[tool]:
            raise ValueError(
                f"Invalid action '{action}' for tool '{tool}'. "
                f"Valid actions: {VALID_TOOLS[tool]}"
            )
        return self


# ─── Workflow DAG ───────────────────────────────────────────────────
class WorkflowDAG(BaseModel):
    """
    Complete workflow directed acyclic graph.
    This is the primary contract between LLM output and the execution engine.
    """
    workflow_name: str = Field(..., description="Human-readable workflow name")
    nodes: list[DAGNode] = Field(..., min_length=1, description="Ordered list of DAG steps")

    # Optional metadata
    description: Optional[str] = Field(default=None)
    workflow_id: Optional[str] = Field(default=None, description="Unique execution ID")
    execution_layers: Optional[list[list[str]]] = Field(default=None, description="Manually specified execution layers from the planner")
    context_refs: Optional[dict[str, str]] = Field(default=None, description="Context template assignments")

    @model_validator(mode="after")
    def validate_dag_integrity(self) -> "WorkflowDAG":
        """Validates: no duplicate IDs, valid dependency refs, no cycles."""
        node_ids = {node.id for node in self.nodes}

        # Check for duplicates
        if len(node_ids) != len(self.nodes):
            seen = set()
            dupes = []
            for n in self.nodes:
                if n.id in seen:
                    dupes.append(n.id)
                seen.add(n.id)
            raise ValueError(f"Duplicate node IDs: {dupes}")

        # Check dependency references
        for node in self.nodes:
            for dep in node.depends_on:
                if dep not in node_ids:
                    raise ValueError(
                        f"Node '{node.id}' depends on unknown node '{dep}'. "
                        f"Available: {node_ids}"
                    )

        # Cycle detection via topological sort (Kahn's algorithm)
        in_degree = {n.id: 0 for n in self.nodes}
        adj = {n.id: [] for n in self.nodes}
        for node in self.nodes:
            for dep in node.depends_on:
                adj[dep].append(node.id)
                in_degree[node.id] += 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        visited_count = 0
        while queue:
            current = queue.pop(0)
            visited_count += 1
            for neighbor in adj[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if visited_count != len(self.nodes):
            raise ValueError("Cyclic dependency detected in DAG!")

        return self

    def get_execution_order(self) -> list[list[str]]:
        """
        Returns nodes grouped by execution level (topological layers).
        Nodes in the same layer can be executed in parallel.
        """
        in_degree = {n.id: len(n.depends_on) for n in self.nodes}
        adj: dict[str, list[str]] = {n.id: [] for n in self.nodes}
        for node in self.nodes:
            for dep in node.depends_on:
                adj[dep].append(node.id)

        layers: list[list[str]] = []
        queue = [nid for nid, deg in in_degree.items() if deg == 0]

        while queue:
            layers.append(list(queue))
            next_queue = []
            for nid in queue:
                for neighbor in adj[nid]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        next_queue.append(neighbor)
            queue = next_queue

        return layers

    def node_map(self) -> dict[str, DAGNode]:
        """Returns a dict of node_id → DAGNode for fast lookup."""
        return {n.id: n for n in self.nodes}
