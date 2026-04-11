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
        raise Exception("Jira Credentials Missing: Please connect your Jira account in the 'Connect Tools' dashboard.")
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
            
        else:
            raise ValueError(f"Unknown Jira action: {action}")
            
    except Exception as e:
        logger.error(f"Jira execution failed: {e}")
        return {"status": "error", "error": str(e)}
