"""
agentic_executor.py

Production-ready DAG Executor for the Agentic MCP Gateway.
Features: Cycle detection, async concurrency, exponential backoff, HITL, timeouts, cross-node templating.
"""

import asyncio
import json
import re
import sys
import time
from typing import Any, Dict, List, Optional, Set

# Ensure UTF-8 output for emojis and formatting
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# --- Data Models ---

class TaskState:
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class Node:
    def __init__(self, data: Dict[str, Any]):
        self.id: str = data["id"]
        self.name: str = data["name"]
        self.tool: str = data["tool"]
        self.action: str = data["action"]
        self.inputs: Dict[str, Any] = data.get("inputs", {})
        self.depends_on: List[str] = data.get("depends_on", [])
        self.requires_approval: bool = data.get("requires_approval", False)
        
        # Reliability Config
        retry = data.get("retry", {})
        self.max_attempts: int = retry.get("max_attempts", 3)
        self.backoff_factor: float = retry.get("backoff_factor", 2.0)
        self.initial_delay: float = retry.get("initial_delay", 1.0)
        self.timeout: int = retry.get("timeout", 10)  # seconds
        
        # State
        self.state: str = TaskState.PENDING
        self.output: Dict[str, Any] = {}
        self.error: Optional[str] = None
        self.attempts: int = 0
        self.logs: List[Dict[str, Any]] = []

# --- System Logger ---

def log_event(status: str, message: str, color_code: str = "0"):
    """Format matching the requested output structure."""
    print(f"[\033[{color_code}m{status}\033[0m] {message}")


# --- Mock MCP Router ---

async def dispatch_mcp(tool: str, action: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Stub to simulate external tool execution over MCP."""
    await asyncio.sleep(0.5) # Simulate network latency
    
    if action == "link_issue": # Simulate a transient failure for demonstration
        if not hasattr(dispatch_mcp, "failed_once"):
            dispatch_mcp.failed_once = True
            raise ConnectionError("GitHub API rate limit exceeded")
            
    if tool == "jira_mcp": return {"ticket_id": "PRJ-999"}
    if tool == "github_mcp": return {"linked": True}
    if tool == "slack_mcp": return {"delivered": True}
    if tool == "sheets_mcp": return {"row_updated": 42}
    
    return {"status": "ok"}


# --- Core Executor Engine ---

class DAGExecutor:
    def __init__(self, dag_json: Dict[str, Any]):
        self.nodes: Dict[str, Node] = {n["id"]: Node(n) for n in dag_json["nodes"]}
        self.completed: Set[str] = set()
        self.failed: Set[str] = set()
        
        self._validate_dag()

    def _validate_dag(self):
        """Perform topological sort check to detect cycles."""
        visited = set()
        path = set()

        def visit(node_id):
            if node_id in path:
                raise ValueError(f"Cyclic dependency detected involving node: {node_id}")
            if node_id in visited:
                return
            
            path.add(node_id)
            for dep in self.nodes[node_id].depends_on:
                if dep not in self.nodes:
                    raise ValueError(f"Node {node_id} depends on missing node {dep}")
                visit(dep)
            path.remove(node_id)
            visited.add(node_id)

        for n_id in self.nodes:
            visit(n_id)

    def _resolve_inputs(self, node: Node) -> Dict[str, Any]:
        """Resolve templated variables {{task_id.output.field}} via regex."""
        resolved = {}
        pattern = re.compile(r"\{\{([^.]+)\.output\.([^}]+)\}\}")
        
        def interpolator(match):
            ref_task, field = match.groups()
            if ref_task not in self.completed:
                raise ValueError(f"Missing dependency payload for {ref_task}")
            
            val = self.nodes[ref_task].output.get(field)
            if val is None:
                raise ValueError(f"Field '{field}' missing from {ref_task} output")
            return str(val)

        for key, value in node.inputs.items():
            if isinstance(value, str):
                resolved[key] = pattern.sub(interpolator, value)
            else:
                resolved[key] = value
        return resolved

    async def _execute_with_retry(self, node: Node, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Executes the specific MCP router with exponential backoff and timeout."""
        delay = node.initial_delay
        
        while node.attempts < node.max_attempts:
            node.attempts += 1
            try:
                # Enforce timeout boundary
                return await asyncio.wait_for(
                    dispatch_mcp(node.tool, node.action, inputs),
                    timeout=node.timeout
                )
            except Exception as e:
                is_last_attempt = node.attempts >= node.max_attempts
                if not is_last_attempt:
                    log_event("FAILED", f"{node.id} (Attempt {node.attempts})", "31")
                    log_event("RETRY", f"Retrying in {delay}s...", "33")
                    await asyncio.sleep(delay)
                    delay *= node.backoff_factor
                else:
                    raise e

    async def _run_node(self, node: Node):
        """Task lifecycle manager: state updates, HITL, retries, and failure capture."""
        node.state = TaskState.RUNNING
        log_event("RUNNING", f"{node.id}: {node.name}", "36")
        
        # Human-In-The-Loop Breakpoint
        if node.requires_approval:
            log_event("WAITING", f"{node.id} requires approval", "33")
            response = await asyncio.to_thread(input, "Approve? (y/n): ")
            if response.strip().lower() != 'y':
                node.state = TaskState.SKIPPED
                node.error = "Rejected by operator"
                log_event("SKIPPED", f"{node.id} (Rejected)", "90")
                self.failed.add(node.id)  # Treat rejection as failure to block downstream
                return

        # Resolve templates & execution Context
        try:
            inputs = self._resolve_inputs(node)
            output = await self._execute_with_retry(node, inputs)
            
            node.output = output
            node.state = TaskState.SUCCESS
            self.completed.add(node.id)
            log_event("SUCCESS", node.id, "32")
            
        except Exception as e:
            node.state = TaskState.FAILED
            node.error = str(e)
            self.failed.add(node.id)
            log_event("FAILED", f"{node.id} (Terminal: {str(e)})", "31")

    async def run(self):
        """Topological event loop capable of resolving concurrent async events."""
        log_event("PLANNER", f"DAG loaded: {len(self.nodes)} tasks\n", "34")
        
        pending_ids = set(self.nodes.keys())
        running_tasks = set()
        
        while pending_ids or running_tasks:
            ready_to_run = []
            
            for n_id in list(pending_ids):
                node = self.nodes[n_id]
                
                # Fast fail downstream nodes if dependency crashed
                if any(dep in self.failed for dep in node.depends_on):
                    node.state = TaskState.SKIPPED
                    node.error = "Upstream dependency failed"
                    self.failed.add(n_id)
                    pending_ids.remove(n_id)
                    log_event("SKIPPED", f"{node.id} (Dependency failure)", "90")
                    continue
                
                # Check if unblocked
                if all(dep in self.completed for dep in node.depends_on):
                    ready_to_run.append(n_id)
                    pending_ids.remove(n_id)
            
            # Submits newly unblocked tasks onto asyncio event loop
            for n_id in ready_to_run:
                task = asyncio.create_task(self._run_node(self.nodes[n_id]))
                running_tasks.add(task)
                
            if not running_tasks and pending_ids:
                raise RuntimeError(f"Deadlock detected! Blocked nodes: {pending_ids}")
                
            # Yield control, wait for at least one routine to finish
            if running_tasks:
                done, running_tasks = await asyncio.wait(
                    running_tasks, return_when=asyncio.FIRST_COMPLETED
                )

        print("\n\033[1m[WORKFLOW COMPLETE]\033[0m")

# --- Runner ---
if __name__ == "__main__":
    with open("sample_dag.json") as f:
        dag_data = json.load(f)
    try:
        asyncio.run(DAGExecutor(dag_data).run())
    except KeyboardInterrupt:
        print("\n[TERMINATED] Execution aborted by user.")
