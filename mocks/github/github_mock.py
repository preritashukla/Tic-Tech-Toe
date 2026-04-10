from fastapi import FastAPI, Header, HTTPException
import logging
from datetime import datetime

app = FastAPI()

SCOPED_CREDS = {
    "github_token": ["create_branch"]
}

def check_scope(token: str, action: str):
    allowed = SCOPED_CREDS.get(token, [])
    if action not in allowed:
        raise HTTPException(403, "Not allowed")

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

@app.post("/create_branch")
async def create_branch(body: dict, authorization: str = Header(...)):
    check_scope(authorization, "create_branch")

    if body.get("fail"):
        raise HTTPException(500, "Simulated failure")

    response = {
        "branch": body.get("branch", "fix/issue"),
        "sha": "abc123",
        "created": True
    }

    log_action("github", "create_branch", body, authorization, "success")
    return response

@app.get("/tools")
async def list_tools():
    return {
        "tools": [
            {
                "name": "create_branch",
                "description": "Create a GitHub branch",
                "params": {"branch": "string"}
            }
        ]
    }