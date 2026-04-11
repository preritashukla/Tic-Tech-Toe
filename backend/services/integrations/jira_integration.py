import os
import httpx
import logging
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("mcp_gateway.jira_integration")

def get_jira_auth() -> tuple:
    email = os.getenv("JIRA_EMAIL")
    api_token = os.getenv("JIRA_API_TOKEN")
    if not email or not api_token:
        logger.warning("JIRA_EMAIL or JIRA_API_TOKEN not set in environment.")
        return None
    return (email, api_token)

def get_jira_domain() -> str:
    # Check JIRA_BASE_URL first (original support), then fallback to JIRA_DOMAIN
    domain = os.getenv("JIRA_BASE_URL") or os.getenv("JIRA_DOMAIN", "your-domain.atlassian.net")
    if not domain.startswith("http"):
        domain = f"https://{domain}"
    return domain.rstrip("/")

async def call_jira_api(method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict:
    auth = get_jira_auth()
    domain = get_jira_domain()
    url = f"{domain}/rest/api/3{endpoint}"
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method, 
            url, 
            auth=auth, 
            json=data, 
            params=params, 
            headers=headers
        )
        
        if response.status_code >= 400:
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            raise Exception(f"Jira API Error ({response.status_code}): {error_detail}")
            
        if response.status_code == 204:
            return {"status": "success"}
            
        return response.json()

async def get_issue(issue_id: str) -> Dict:
    data = await call_jira_api("GET", f"/issue/{issue_id}")
    fields = data.get("fields", {})
    return {
        "key": data.get("key"),
        "summary": fields.get("summary"),
        "status": fields.get("status", {}).get("name"),
        "priority": fields.get("priority", {}).get("name"),
        "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else None,
        "description": fields.get("description"),
        "self": data.get("self")
    }

async def create_issue(project_key: str, summary: str, description: str = "", issue_type: str = "Task") -> Dict:
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}]
                    }
                ]
            },
            "issuetype": {"name": issue_type}
        }
    }
    data = await call_jira_api("POST", "/issue", data=payload)
    return {
        "key": data.get("key"),
        "id": data.get("id"),
        "url": f"{get_jira_domain()}/browse/{data['key']}"
    }

async def update_issue(issue_id: str, status: Optional[str] = None, summary: Optional[str] = None) -> Dict:
    payload = {"fields": {}}
    if summary:
        payload["fields"]["summary"] = summary
        
    if payload["fields"]:
        await call_jira_api("PUT", f"/issue/{issue_id}", data=payload)
    
    return {"status": "success", "issue_id": issue_id}


async def get_epic_children(epic_key: str) -> Dict:
    """
    Fetch all child issues of a Jira Epic using JQL.
    Supports both "Epic Link" and "parent" relationships.
    """
    jql = f'"Epic Link" = {epic_key} OR parent = {epic_key}'
    try:
        data = await call_jira_api("GET", "/search/jql", params={
            "jql": jql,
            "fields": "summary,status,issuetype,priority,assignee",
            "maxResults": 100
        })
    except Exception:
        # Fallback: some Jira configs don't support "Epic Link"
        jql_fallback = f'parent = {epic_key}'
        data = await call_jira_api("GET", "/search/jql", params={
            "jql": jql_fallback,
            "fields": "summary,status,issuetype,priority,assignee",
            "maxResults": 100
        })
    
    issues = []
    for item in data.get("issues", []):
        fields = item.get("fields", {})
        issues.append({
            "key": item["key"],
            "summary": fields.get("summary", ""),
            "status": fields.get("status", {}).get("name"),
            "issue_type": fields.get("issuetype", {}).get("name"),
            "priority": fields.get("priority", {}).get("name"),
            "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else None,
        })
    
    return {
        "epic_key": epic_key,
        "children": issues,
        "count": len(issues)
    }


async def bulk_update_status(issue_keys: list, status: str) -> Dict:
    """Update status for multiple Jira issues (best-effort)."""
    results = []
    for key in issue_keys:
        try:
            await update_issue(key, status=status)
            results.append({"key": key, "status": "updated"})
        except Exception as e:
            results.append({"key": key, "status": "failed", "error": str(e)})
    
    succeeded = sum(1 for r in results if r["status"] == "updated")
    return {
        "updated": results,
        "succeeded": succeeded,
        "failed": len(results) - succeeded,
        "total": len(results)
    }


async def execute_jira(action: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        if action == "get_issue" or action == "get_ticket":
            issue_id = params.get("issue_id") or params.get("ticket_id")
            if not issue_id:
                raise ValueError("issue_id is required")
            output = await get_issue(issue_id)
            return {"status": "success", "output": output}
            
        elif action == "create_issue" or action == "create_ticket":
            # Check for JIRA_PROJECT_KEY env if not in params
            default_project = os.environ.get("JIRA_PROJECT_KEY", "PROJ")
            project_key = params.get("project_key") or params.get("project") or default_project
            summary = params.get("summary") or params.get("title") or "New Issue"
            description = params.get("description") or ""
            issue_type = params.get("issue_type") or "Bug"
            output = await create_issue(project_key, summary, description, issue_type)
            return {"status": "success", "output": output}
            
        elif action == "update_issue" or action == "update_ticket":
            issue_id = params.get("issue_id") or params.get("ticket_id")
            if not issue_id:
                raise ValueError("issue_id is required")
            output = await update_issue(issue_id, status=params.get("status"), summary=params.get("summary"))
            return {"status": "success", "output": output}

        elif action == "get_epic_children" or action == "get_epic_issues":
            epic_key = params.get("epic_key") or params.get("issue_id")
            if not epic_key:
                raise ValueError("epic_key is required")
            output = await get_epic_children(epic_key)
            return {"status": "success", "output": output}

        elif action == "bulk_update_status":
            issue_keys = params.get("issue_keys", [])
            status = params.get("status", "In Progress")
            output = await bulk_update_status(issue_keys, status)
            return {"status": "success", "output": output}
            
        else:
            raise ValueError(f"Unknown Jira action: {action}")
            
    except Exception as e:
        logger.error(f"Jira execution failed: {e}")
        return {"status": "error", "error": str(e)}

