from fastapi import FastAPI, Header, HTTPException
import logging
from datetime import datetime

app = FastAPI()

SCOPED_CREDS = {
    "sheets_token": ["update_row"]
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

@app.post("/update_row")
async def update_row(body: dict, authorization: str = Header(...)):
    check_scope(authorization, "update_row")

    response = {
        "updated_row": 45,
        "spreadsheet_id": "sheet123"
    }

    log_action("sheets", "update_row", body, authorization, "success")
    return response

@app.get("/tools")
async def list_tools():
    return {
        "tools": [
            {
                "name": "update_row",
                "description": "Update a row in Google Sheets",
                "params": {"row": "number", "data": "object"}
            }
        ]
    }