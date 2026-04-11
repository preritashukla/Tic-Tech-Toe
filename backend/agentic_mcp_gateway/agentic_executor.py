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
        self.mock_output: Dict[str, Any] = data.get("mock_output", {})
        
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

TOOL_PORT_MAP = {
    "jira_mcp": 8001,
    "github_mcp": 8002,
    "slack_mcp": 8003,
    "sheets_mcp": 8004,
}

import urllib.request
import urllib.error

async def dispatch_mcp(tool: str, action: str, inputs: Dict[str, Any], mock_output: Dict[str, Any] = None) -> Dict[str, Any]:
    """If true MCP servers are up, hit them natively! Otherwise fallback to live integrations or mock JSON."""
    
    # 1. Check for Live Integrations (overriding the mock)
    if tool in ["slack", "slack_mcp"]:
        try:
            from services.integrations.slack_integration import execute_slack
            result = await execute_slack(action, inputs, {})
            if result.get("status") == "success":
                return result.get("output", {})
            else:
                raise Exception(result.get("error", "Unknown Slack error"))
        except Exception as e:
            if mock_output:
                log_event("WARNING", f"Slack failed, using mock: {e}", "33")
                return mock_output
            raise e

    if tool in ["sheets", "sheets_mcp"]:
        try:
            from services.integrations.sheets_integration import execute_sheets
            result = await execute_sheets(action, inputs, {})
            if result.get("status") in ["success", "ok"]:
                return result.get("output", result.get("data", {}))
            else:
                raise Exception(result.get("error", "Unknown Sheets error"))
        except Exception as e:
            if mock_output:
                log_event("WARNING", f"Sheets failed, using mock: {e}", "33")
                return mock_output
            raise e

    if tool in ["github", "github_mcp"]:
        try:
            from agentic_mcp_gateway.github_mcp import handle_github_tool
            return await handle_github_tool(action, inputs)
        except Exception as e:
            if mock_output:
                log_event("WARNING", f"GitHub failed, using mock: {e}", "33")
                return mock_output
            raise e

    if tool in ["jira", "jira_mcp"]:
        try:
            from services.integrations.jira_integration import execute_jira
            result = await execute_jira(action, inputs, {})
            if result.get("status") == "success":
                return result.get("output", {})
            else:
                raise Exception(result.get("error", "Unknown Jira error"))
        except Exception as e:
            if mock_output:
                log_event("WARNING", f"Jira failed, using mock: {e}", "33")
                return mock_output
            raise e

    # 2. Check for real MCP server containers
    if tool in TOOL_PORT_MAP:
        port = TOOL_PORT_MAP[tool]
        # Route to exact docker container endpoints
        url = f"http://localhost:{port}/{action}"
        
        # Token mapping for the respective MCP servers
        auth_header = f"{tool.split('_')[0]}_token" 
        
        def _make_req():
            req = urllib.request.Request(
                url, 
                data=json.dumps(inputs).encode('utf-8'), 
                headers={'Content-Type': 'application/json', 'Authorization': auth_header}
            )
            try:
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return json.loads(resp.read().decode('utf-8'))
            except Exception as e:
                raise ConnectionError(f"Real MCP container at {port} unreachable: {e}")
                
        return await asyncio.to_thread(_make_req)

    raise ValueError(f"No live integration or MCP server found for tool: {tool}")


# --- Core Executor Engine ---

class DAGExecutor:
    def __init__(self, dag_json: Dict[str, Any], auto_approve: bool = False):
        self.nodes: Dict[str, Node] = {}
        self.auto_approve = auto_approve
        for n in dag_json["nodes"]:
            if n["id"] in self.nodes:
                raise ValueError(f"Duplicate Node ID detected: {n['id']}")
            self.nodes[n["id"]] = Node(n)
            
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

    def _resolve_templates(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve templated variables {{task_id.output.field}} via regex, supporting nested keys."""
        resolved = {}
        pattern = re.compile(r"\{\{([^.]+)\.output\.([^}]+)\}\}")
        
        def interpolator(match):
            ref_task, field_path = match.groups()
            if ref_task not in self.completed:
                raise ValueError(f"Missing dependency payload for {ref_task}")
            
            # Navigate nested dictionary (e.g., "channel.id")
            val = self.nodes[ref_task].output
            for part in field_path.split('.'):
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    raise ValueError(f"Field path '{field_path}' missing from {ref_task} output at '{part}'")
            return str(val)

        for key, value in payload.items():
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
                # Prepare generic mock output if provided in DAG
                dynamic_mock = self._resolve_templates(node.mock_output) if node.mock_output else None
                # Enforce timeout boundary
                return await asyncio.wait_for(
                    dispatch_mcp(node.tool, node.action, inputs, dynamic_mock),
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
        if node.requires_approval and not self.auto_approve:
            log_event("WAITING", f"{node.id} requires approval", "33")
            # In a real API, we wait for an external approval signal.
            # For this hackathon/demo, if auto_approve is false and we reach here, 
            # we'll log it and skip to avoid hanging the server.
            node.state = TaskState.SKIPPED
            node.error = "Pending human approval (HITL)"
            log_event("WAITING", f"{node.id} (Paused for HITL)", "33")
            self.failed.add(node.id) 
            return

        # Resolve templates & execution Context
        try:
            inputs = self._resolve_templates(node.inputs)
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
    import argparse
    parser = argparse.ArgumentParser(description="Agentic DAG Executor")
    parser.add_argument("dag_file", nargs="?", default="sample_dag.json", help="Path to JSON DAG")
    args = parser.parse_args()

    with open(args.dag_file) as f:
        dag_data = json.load(f)
    try:
        asyncio.run(DAGExecutor(dag_data).run())
    except KeyboardInterrupt:
        print("\n[TERMINATED] Execution aborted by user.")
