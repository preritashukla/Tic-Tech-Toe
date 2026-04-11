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
            # ── Comprehensive fallback for ALL GitHub actions ─────────────────
            # Ensures demo stability even if the real API fails or LLM gives
            # incomplete inputs (missing owner/repo, bad field names, etc.)
            owner = inputs.get("owner", "demo-org")
            repo = inputs.get("repo", inputs.get("repo_full_name", "demo-repo"))

            if action == "list_commits":
                return {
                    "commit_count": 3,
                    "latest_commit_sha": "abc1234def5678",
                    "latest_commit_msg": "feat: add workflow orchestration support",
                    "latest_commit_author": "demo-user",
                    "latest_commit_date": "2026-04-11T07:00:00Z",
                    "commits_json": [
                        {"sha": "abc1234", "commit": {"message": "feat: add workflow orchestration support", "author": {"name": "demo-user", "date": "2026-04-11T07:00:00Z"}}},
                        {"sha": "def5678", "commit": {"message": "fix: resolve async executor deadlock", "author": {"name": "demo-user", "date": "2026-04-10T18:00:00Z"}}},
                        {"sha": "ghi9012", "commit": {"message": "chore: update dependencies", "author": {"name": "demo-user", "date": "2026-04-09T12:00:00Z"}}},
                    ],
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "get_repository":
                return {
                    "repo_full_name": f"{owner}/{repo}",
                    "repo_default_branch": "main",
                    "repo_clone_url": f"https://github.com/{owner}/{repo}.git",
                    "repo_html_url": f"https://github.com/{owner}/{repo}",
                    "repo_open_issues": 5,
                    "repo_language": "Python",
                    "repo_private": False,
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action in ("link_issue", "create_pr", "create_pull_request"):
                return {
                    "success": True,
                    "pr_number": 42,
                    "pr_url": f"https://github.com/{owner}/{repo}/pull/42",
                    "linked_to": inputs.get("jira_ticket_id", inputs.get("issue_id", "unknown")),
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "create_branch":
                branch = inputs.get("branch_name", inputs.get("name", f"fix/auto-{random.randint(100,999)}"))
                return {
                    "success": True,
                    "branch_name": branch,
                    "branch_url": f"https://github.com/{owner}/{repo}/tree/{branch}",
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action in ("merge_pr", "merge_pull_request"):
                return {
                    "success": True,
                    "merged": True,
                    "pr_number": inputs.get("pr_number", 42),
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "list_issues":
                return {
                    "issue_count": 2,
                    "first_issue_number": 1,
                    "first_issue_title": "Demo issue: workflow test",
                    "first_issue_url": f"https://github.com/{owner}/{repo}/issues/1",
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "list_branches":
                return {
                    "branch_names": ["main", "develop", "feature/agentic-workflows"],
                    "branch_count": 3,
                    "note": f"Fallback due to: {str(e)}"
                }
            elif action == "get_file_content":
                return {
                    "file_name": inputs.get("path", "README.md"),
                    "file_content": "# Demo Repository\nThis is a fallback mock response.",
                    "note": f"Fallback due to: {str(e)}"
                }
            # Generic success for any other unrecognized GitHub action
            return {
                "success": True,
                "tool": tool,
                "action": action,
                "note": f"Generic GitHub fallback due to: {str(e)}"
            }

            
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

    elif tool == "system_mcp":
        if action == "summarize":
            from services.llm import get_llm_service
            text_to_summarize = inputs.get("text", "")
            if not text_to_summarize:
                return {"summary": "No content provided to summarize."}
            
            # Convert dict/list inputs to string if needed
            if isinstance(text_to_summarize, (dict, list)):
                text_to_summarize = json.dumps(text_to_summarize, indent=2)
            
            summary = await get_llm_service().summarize_payload(str(text_to_summarize))
            return {"summary": summary}

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

