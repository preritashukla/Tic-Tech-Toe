from fastapi import FastAPI, Header, HTTPException
import logging
from datetime import datetime

app = FastAPI()

# ---------------- AUTH ----------------
SCOPED_CREDS = {
    "jira_token": ["get_issue", "create_issue"]
}

def check_scope(token: str, action: str):
    allowed = SCOPED_CREDS.get(token, [])
    if action not in allowed:
        raise HTTPException(403, "Token not allowed for this action")

# ---------------- LOGGING ----------------
logging.basicConfig(filename="audit.log", level=logging.INFO)

def log_action(tool, action, params, token, status):
    logging.info({
        "timestamp": str(datetime.now()),
        "tool": tool,
        "action": action,
        "params": params,
        "token": token,
        "status": status
    })

# ---------------- ENDPOINTS ----------------
@app.post("/get_issue")
async def get_issue(body: dict, authorization: str = Header(...)):
    check_scope(authorization, "get_issue")

    if body.get("fail"):
        raise HTTPException(500, "Simulated failure")

    response = {
        "key": "JIRA-102",
        "summary": "Login page crash",
        "status": "Open",
        "priority": "Critical"
    }

    log_action("jira", "get_issue", body, authorization, "success")
    return response


@app.post("/create_issue")
async def create_issue(body: dict, authorization: str = Header(...)):
    check_scope(authorization, "create_issue")

    response = {
        "key": "JIRA-103",
        "id": "10042",
        "url": "http://jira.local/JIRA-103"
    }

    log_action("jira", "create_issue", body, authorization, "success")
    return response


# ---------------- MCP TOOLS ----------------
@app.get("/tools")
async def list_tools():
    return {
        "tools": [
            {
                "name": "get_issue",
                "description": "Fetch a Jira issue",
                "params": {"issue_id": "string"}
            },
            {
                "name": "create_issue",
                "description": "Create a Jira issue",
                "params": {"summary": "string", "priority": "string"}
            }
        ]
    }