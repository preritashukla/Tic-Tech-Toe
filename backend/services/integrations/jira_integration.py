import os
import httpx
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("mcp_gateway.integrations.jira")

async def execute_jira(action: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute Jira actions against the live Atlassian REST API."""
    base_url = os.environ.get("JIRA_BASE_URL", "").rstrip("/")
    email = os.environ.get("JIRA_EMAIL", "").strip()
    token = os.environ.get("JIRA_API_TOKEN", "").strip()
    project_key = os.environ.get("JIRA_PROJECT_KEY", "PROJ")

    if not all([base_url, email, token]):
        return {
            "status": "error",
            "error": "Jira credentials not configured in environment (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)"
        }

    auth = (email, token)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        try:
            if action == "create_issue":
                summary = params.get("summary", "New issue from MCP")
                priority = params.get("priority", "Medium")
                project = params.get("project_key", project_key)
                issue_type = params.get("issue_type", "Bug")
                description = params.get("description", "")

                payload = {
                    "fields": {
                        "project": {"key": project},
                        "summary": summary,
                        "issuetype": {"name": issue_type},
                        "priority": {"name": priority},
                    }
                }

                if description:
                    payload["fields"]["description"] = {
                        "type": "doc",
                        "version": 1,
                        "content": [{
                            "type": "paragraph",
                            "content": [{"type": "text", "text": description}]
                        }]
                    }

                url = f"{base_url}/rest/api/3/issue"
                r = await client.post(url, auth=auth, headers=headers, json=payload, timeout=10)
                
                if r.status_code not in (200, 201):
                    return {"status": "error", "error": f"Jira API error ({r.status_code}): {r.text}"}
                
                data = r.json()
                return {
                    "status": "success",
                    "output": {
                        "key": data["key"],
                        "id": data["id"],
                        "url": f"{base_url}/browse/{data['key']}"
                    }
                }

            elif action == "get_issue":
                issue_id = params.get("issue_id")
                if not issue_id:
                    return {"status": "error", "error": "Missing issue_id"}

                url = f"{base_url}/rest/api/3/issue/{issue_id}"
                r = await client.get(url, auth=auth, headers=headers, timeout=10)
                
                if r.status_code == 404:
                    return {"status": "error", "error": f"Jira issue not found: {issue_id}"}
                if r.status_code != 200:
                    return {"status": "error", "error": f"Jira API error ({r.status_code}): {r.text}"}
                
                data = r.json()
                fields = data.get("fields", {})
                return {
                    "status": "success",
                    "output": {
                        "key": data["key"],
                        "summary": fields.get("summary", ""),
                        "status": (fields.get("status") or {}).get("name", ""),
                        "priority": (fields.get("priority") or {}).get("name", ""),
                    }
                }

            else:
                return {"status": "error", "error": f"Unknown Jira action: {action}"}

        except Exception as e:
            logger.error(f"Jira execution failed: {e}")
            return {"status": "error", "error": str(e)}
