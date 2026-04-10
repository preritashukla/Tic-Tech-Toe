from fastapi import FastAPI, Header, HTTPException
import logging
from datetime import datetime

app = FastAPI()

SCOPED_CREDS = {
    "slack_token": ["send_message"]
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

@app.post("/send_message")
async def send_message(body: dict, authorization: str = Header(...)):
    check_scope(authorization, "send_message")

    response = {
        "ok": True,
        "ts": "1712345678.000200",
        "channel": body.get("channel", "#on-call")
    }

    log_action("slack", "send_message", body, authorization, "success")
    return response

@app.get("/tools")
async def list_tools():
    return {
        "tools": [
            {
                "name": "send_message",
                "description": "Send Slack message",
                "params": {"channel": "string", "text": "string"}
            }
        ]
    }