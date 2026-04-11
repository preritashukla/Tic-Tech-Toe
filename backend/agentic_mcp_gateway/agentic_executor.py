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
import os
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


# --- MCP Router ---

async def dispatch_mcp(tool: str, action: str, inputs: Dict[str, Any], credentials: Dict[str, Any] = None, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Acts as the router hitting the various MCP Servers or local service integrations.
    Uses provided credentials first, falling back to environment variables.
    """
    log_event("DISPATCH", f"{tool}.{action}", "35")
    
    # Extract tool-specific credentials if available
    tool_creds = (credentials or {}).get(tool.split('_')[0], {})
    if isinstance(tool_creds, str):
        try:
            tool_creds = json.loads(tool_creds)
        except:
            tool_creds = {"token": tool_creds}

    # 1. GitHub Integration
    if tool in ["github", "github_mcp"]:
        try:
            # Apply dynamic token if provided
            github_token = tool_creds.get("password") or tool_creds.get("token")
            if github_token:
                os.environ["GITHUB_TOKEN"] = github_token

            from github_mcp import handle_github_tool
            return await handle_github_tool(action, inputs, context)
        except Exception as e:
            log_event("ERROR", f"GitHub failed: {e}", "31")
            raise e

    # 2. Jira Integration
    elif tool in ["jira", "jira_mcp"]:
        try:
            # Apply dynamic credentials if provided
            jira_email = tool_creds.get("email")
            jira_token = tool_creds.get("password") or tool_creds.get("token")
            jira_domain = tool_creds.get("domain")
            
            if jira_email: os.environ["JIRA_EMAIL"] = jira_email
            if jira_token: os.environ["JIRA_API_TOKEN"] = jira_token
            if jira_domain: os.environ["JIRA_DOMAIN"] = jira_domain

            from services.integrations.jira_integration import execute_jira
            result = await execute_jira(action, inputs, context)
            if result.get("status") == "success":
                return result.get("output", {})
            else:
                raise Exception(result.get("error", "Unknown Jira error"))
        except Exception as e:
            log_event("ERROR", f"Jira failed: {e}", "31")
            raise e

    # 3. Slack Integration
    elif tool in ["slack", "slack_mcp"]:
        try:
            slack_token = tool_creds.get("password") or tool_creds.get("token")
            if slack_token:
                os.environ["SLACK_BOT_TOKEN"] = slack_token

            from services.integrations.slack_integration import execute_slack
            result = await execute_slack(action, inputs, context)
            if result.get("status") == "success":
                return result.get("output", {})
            else:
                raise Exception(result.get("error", "Unknown Slack error"))
        except Exception as e:
            log_event("ERROR", f"Slack failed: {e}", "31")
            raise e

    # 4. Google Sheets Integration
    elif tool in ["sheets", "sheets_mcp", "sheet"]:
        try:
            sheets_creds = tool_creds.get("token") 
            if sheets_creds:
                os.environ["GOOGLE_SHEETS_CREDENTIALS_JSON"] = sheets_creds

            from services.integrations.sheets_integration import execute_sheets
            result = await execute_sheets(action, inputs, context)
            if result.get("status") == "success":
                return result.get("output", {})
            else:
                raise Exception(result.get("error", "Unknown Sheets error"))
        except Exception as e:
            log_event("ERROR", f"Sheets failed: {e}", "31")
            raise e

    raise ValueError(f"No integration found for tool: {tool}")


# --- Core Executor Engine ---

class DAGExecutor:
    def __init__(self, dag_json: Dict[str, Any], credentials: Dict[str, Any] = None, auto_approve: bool = False, execution_id: Optional[str] = None):
        self.credentials = credentials or {}
        self.auto_approve = auto_approve
        self.nodes: Dict[str, Node] = {}
        for n in dag_json["nodes"]:
            if n["id"] in self.nodes:
                raise ValueError(f"Duplicate Node ID detected: {n['id']}")
            self.nodes[n["id"]] = Node(n)
            
        self.completed: Set[str] = set()
        self.failed: Set[str] = set()
        self.execution_id = execution_id or f"exec-{int(time.time())}"
        
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
                context = {"metadata": {"execution_id": getattr(self, "execution_id", "system-agentic")}}
                return await asyncio.wait_for(
                    dispatch_mcp(node.tool, node.action, inputs, credentials=self.credentials, context=context),
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
                
                # Fast fail downstream nodes if dependency crashed or was skipped
                if any(dep in self.failed for dep in node.depends_on):
                    node.state = TaskState.SKIPPED
                    node.error = "Upstream dependency failed"
                    self.failed.add(n_id)
                    pending_ids.remove(n_id)
                    log_event("SKIPPED", f"{node.id} (Dependency failure)", "90")
                    continue
                
                # Check if all dependencies are successfully completed
                if all(dep in self.completed for dep in node.depends_on):
                    ready_to_run.append(n_id)
                    pending_ids.remove(n_id)
            
            # Submits newly unblocked tasks onto asyncio event loop
            for n_id in ready_to_run:
                task = asyncio.create_task(self._run_node(self.nodes[n_id]))
                running_tasks.add(task)
                
            # Yield control, wait for at least one routine to finish
            if running_tasks:
                done, running_tasks = await asyncio.wait(
                    running_tasks, return_when=asyncio.FIRST_COMPLETED
                )
            elif pending_ids:
                # If no tasks are running and we couldn't unblock any more, it's a real deadlock
                raise RuntimeError(f"Deadlock detected! Blocked nodes: {pending_ids}")

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
