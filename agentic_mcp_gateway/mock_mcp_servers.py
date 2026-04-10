"""
mock_mcp_servers.py

Simulates external tools connected via Model Context Protocol (MCP) servers.
For the hackathon, these replace actual API calls.
"""
import asyncio
import random

async def _simulate_network(delay: float = 0.5):
    """Simulate network latency."""
    await asyncio.sleep(delay)

async def dispatch_mcp_call(tool: str, action: str, inputs: dict) -> dict:
    """
    Acts as the router hitting the various MCP Servers.
    In real life this would use the MCP protocol over stdio/HTTP.
    """
    print(f"\n      [NETWORK] Calling {tool}.{action} with payload {inputs}")
    await _simulate_network()
    
    if tool == "jira_mcp":
        if action == "create_ticket":
            # Simulate a 30% chance of random network drop for testing exponential backoff
            if random.random() < 0.3:
                raise ConnectionError("Jira API Gateway 502 Bad Gateway")
            return {
                "ticket_id": f"PROJ-{random.randint(100, 999)}",
                "ticket_url": "https://jira.company.com/browse/PROJ-xxx",
                "status": "created"
            }
            
    elif tool == "github_mcp":
        if action == "link_issue":
            issue_num = inputs.get("issue_number")
            jira_id = inputs.get("jira_ticket_id")
            if not issue_num or not jira_id:
                raise ValueError("Missing required linking fields")
            return {
                "success": True,
                "linked_to": jira_id
            }
            
    elif tool == "slack_mcp":
        if action == "post_message":
            return {
                "delivered": True,
                "timestamp": 1612456789.2312
            }
            
    raise NotImplementedError(f"Unknown tool/action: {tool}.{action}")
