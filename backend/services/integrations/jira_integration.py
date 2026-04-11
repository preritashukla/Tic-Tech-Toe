import os
import httpx
import logging
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from services.audit import get_audit_logger

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

async def call_jira_api(method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None, context: Optional[Dict] = None) -> Dict:
    # 1. Determine Auth Mode
    # Priority: Context (passed from frontend) > Environment (server config)
    ctx_creds = (context or {}).get("credentials", {}).get("jira", {})
    
    oauth_token = ctx_creds.get("access_token") or os.getenv("JIRA_OAUTH_TOKEN")
    cloud_id = ctx_creds.get("cloud_id") or os.getenv("JIRA_CLOUD_ID")
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    auth = None
    
    if oauth_token and cloud_id:
        # OAuth Mode
        url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3{endpoint}"
        headers["Authorization"] = f"Bearer {oauth_token}"
        logger.info(f"Jira API: Using OAuth flow for {endpoint}")
    else:
        # Basic Auth Mode
        email = ctx_creds.get("email") or os.getenv("JIRA_EMAIL")
        token = ctx_creds.get("api_token") or os.getenv("JIRA_API_TOKEN")
        
        if not email or not token:
            raise Exception("Jira Credentials Missing: Please connect your Jira account in the 'Connect Tools' dashboard.")
            
        auth = (email, token)
        domain = get_jira_domain()
        url = f"{domain}/rest/api/3{endpoint}"
        logger.info(f"Jira API: Using Basic Auth flow for {endpoint}")
    
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

async def get_issue(issue_id: str, context: Optional[Dict] = None) -> Dict:
    data = await call_jira_api("GET", f"/issue/{issue_id}", context=context)
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

async def create_issue(project_key: str, summary: str, description: str = "", issue_type: str = "Task", context: Optional[Dict] = None) -> Dict:
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
    data = await call_jira_api("POST", "/issue", data=payload, context=context)
    return {
        "key": data.get("key"),
        "id": data.get("id"),
        "url": f"{get_jira_domain()}/browse/{data['key']}"
    }

async def update_issue(issue_id: str, status: Optional[str] = None, summary: Optional[str] = None, context: Optional[Dict] = None) -> Dict:
    payload = {"fields": {}}
    if summary:
        payload["fields"]["summary"] = summary
        
    if payload["fields"]:
        await call_jira_api("PUT", f"/issue/{issue_id}", data=payload, context=context)
    
    return {"status": "success", "issue_id": issue_id}

async def execute_jira(action: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        if action == "get_issue" or action == "get_ticket":
            issue_id = params.get("issue_id") or params.get("ticket_id")
            if not issue_id:
                raise ValueError("issue_id is required")
            output = await get_issue(issue_id, context=context)
            return {"status": "success", "output": output}
            
        elif action == "create_issue" or action == "create_ticket":
            # Check for JIRA_PROJECT_KEY env if not in params
            default_project = os.environ.get("JIRA_PROJECT_KEY", "PROJ")
            project_key = params.get("project_key") or params.get("project") or default_project
            summary = params.get("summary") or params.get("title") or "New Issue"
            description = params.get("description") or ""
            issue_type = params.get("issue_type") or "Bug"
            output = await create_issue(project_key, summary, description, issue_type, context=context)
            return {"status": "success", "output": output}
            
        elif action == "update_issue" or action == "update_ticket":
            issue_id = params.get("issue_id") or params.get("ticket_id")
            if not issue_id:
                raise ValueError("issue_id is required")
            output = await update_issue(issue_id, status=params.get("status"), summary=params.get("summary"), context=context)
            return {"status": "success", "output": output}
            
        else:
            raise ValueError(f"Unknown Jira action: {action}")
            
    except Exception as e:
        logger.error(f"Jira execution failed: {e}")
        
        # Log to unified audit trail
        audit = get_audit_logger()
        exec_id = (context or {}).get("metadata", {}).get("execution_id", "system-jira")
        audit.log_error(
            execution_id=exec_id,
            error=f"Jira Tool Error: {str(e)}",
            context={
                "tool": "jira",
                "action": action,
                "params": params
            }
        )
        
        return {"status": "error", "error": str(e)}
