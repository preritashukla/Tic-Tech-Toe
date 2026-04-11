"""
mock_mcp_servers.py

Simulates external tools connected via Model Context Protocol (MCP) servers.
For the hackathon, these replace actual API calls.
"""
import asyncio
import random
import json
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "mock_database.json")

def _save_to_db(tool: str, action: str, data: dict):
    """Save execution payloads to a local JSON file to prove data handling during the demo."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "tool": tool,
        "action": action,
        "payload_received": data
    }
    
    records = []
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                records = json.load(f)
        except:
            pass
            
    records.append(entry)
    with open(DB_FILE, "w") as f:
        json.dump(records, f, indent=2)

async def _simulate_network(delay: float = 1.5):
    """Simulate network latency."""
    await asyncio.sleep(delay)

async def dispatch_mcp_call(tool: str, action: str, inputs: dict) -> dict:
    """
    Acts as the router hitting the various MCP Servers.
    In real life this would use the MCP protocol over stdio/HTTP.
    """
    print(f"\n      [NETWORK] Calling {tool}.{action} with payload {inputs}")
    await _simulate_network()
    
    # Save physical data state
    _save_to_db(tool, action, inputs)
    
    if tool == "jira_mcp":
        if action in ("create_ticket", "create_issue"):
            return {
                "ticket_id": f"PROJ-{random.randint(100, 999)}",
                "ticket_url": "https://jira.company.com/browse/PROJ-xxx",
                "status": "created"
            }
        elif action in ("get_issue", "get_ticket"):
            return {
                "ticket_id": inputs.get("issue_id", "PROJ-101"),
                "title": inputs.get("title", "Sample Issue"),
                "status": "open"
            }
        elif action == "update_issue":
            return {
                "ticket_id": inputs.get("issue_id", "PROJ-101"),
                "status": "updated",
                "updated_fields": list(inputs.keys())
            }
            
    elif tool == "github_mcp":
        from .github_mcp import handle_github_tool
        try:
            return await handle_github_tool(action, inputs)
        except Exception as e:
            print(f"      [GITHUB ERROR] {e}")
            # Fallback to mock for demo stability if API call fails (e.g. no token)
            if action in ("link_issue", "create_pr"):
                return {
                    "success": True,
                    "pr_url": "https://github.com/org/repo/pull/42",
                    "linked_to": inputs.get("jira_ticket_id", inputs.get("issue_id", "unknown")),
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "create_branch":
                branch = inputs.get("branch_name", inputs.get("name", f"fix/auto-{random.randint(100,999)}"))
                return {
                    "success": True,
                    "branch_name": branch,
                    "branch_url": f"https://github.com/org/repo/tree/{branch}",
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "merge_pr":
                return {
                    "success": True,
                    "merged": True,
                    "pr_number": inputs.get("pr_number", 42),
                    "note": f"Fallback due to: {str(e)}"
                }
            raise e
            
    elif tool == "slack_mcp":
        if action in ("post_message", "send_message"):
            return {
                "delivered": True,
                "channel": inputs.get("channel", "#general"),
                "timestamp": 1612456789.2312
            }
        elif action == "create_channel":
            return {
                "success": True,
                "channel_id": f"C{random.randint(10000,99999)}",
                "channel_name": inputs.get("name", inputs.get("channel_name", "new-channel"))
            }

    elif tool == "sheets_mcp":
        if action == "read_row":
            return {
                "row": inputs.get("row", 1),
                "data": {"col_a": "value_a", "col_b": "value_b"}
            }
        elif action in ("update_row", "append_row"):
            return {
                "success": True,
                "row": inputs.get("row", 1),
                "action": action
            }
            
    # Catch-all: for any tool/action the LLM generates that we don't explicitly handle,
    # return a generic success so the DAG can proceed in demo mode
    print(f"      [MOCK FALLBACK] No specific handler for {tool}.{action}, returning generic success")
    return {
        "success": True,
        "tool": tool,
        "action": action,
        "message": f"Mock {tool}.{action} completed successfully",
        "inputs_received": inputs
    }

