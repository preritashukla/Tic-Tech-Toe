"""
jira_mock.py  →  jira_live.py (same filename, live implementation)

Replaced hardcoded mock responses with real Jira Cloud REST API v3 calls.

Required environment variables (set in .env):
    JIRA_BASE_URL   – e.g. https://yourcompany.atlassian.net
    JIRA_EMAIL      – Atlassian account email
    JIRA_API_TOKEN  – API token from https://id.atlassian.com/manage-profile/security/api-tokens
    JIRA_PROJECT_KEY – default project key for create_issue (e.g. PROJ)
"""

import os
import logging
from datetime import datetime

import httpx
from fastapi import FastAPI, Header, HTTPException

# ── Load env vars ──────────────────────────────────────────────────────────────
JIRA_BASE_URL    = os.environ.get("JIRA_BASE_URL", "").rstrip("/")
JIRA_EMAIL       = os.environ.get("JIRA_EMAIL", "")
JIRA_API_TOKEN   = os.environ.get("JIRA_API_TOKEN", "")
JIRA_PROJECT_KEY = os.environ.get("JIRA_PROJECT_KEY", "PROJ")

if not all([JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN]):
    raise RuntimeError(
        "Missing required environment variables: "
        "JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN"
    )

# Basic-auth tuple used by httpx
_AUTH = (JIRA_EMAIL, JIRA_API_TOKEN)
_HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}

app = FastAPI(title="Jira Live MCP Server")

# ── Scoped token auth (unchanged from mock) ────────────────────────────────────
SCOPED_CREDS = {
    "jira_token": ["get_issue", "create_issue"]
}

def check_scope(token: str, action: str):
    allowed = SCOPED_CREDS.get(token, [])
    if action not in allowed:
        raise HTTPException(403, "Token not allowed for this action")

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(filename="audit.log", level=logging.INFO)

def log_action(tool, action, params, token, status):
    logging.info({
        "timestamp": str(datetime.now()),
        "tool": tool,
        "action": action,
        "params": params,
        "token": token,
        "status": status,
    })

# ── Helpers ────────────────────────────────────────────────────────────────────
def _jira_url(path: str) -> str:
    return f"{JIRA_BASE_URL}/rest/api/3/{path.lstrip('/')}"

async def _http_get(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(_jira_url(path), auth=_AUTH, headers=_HEADERS, timeout=10)
    if r.status_code == 404:
        raise HTTPException(404, f"Jira issue not found: {path}")
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Jira API error: {r.text}")
    return r.json()

async def _http_post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            _jira_url(path), auth=_AUTH, headers=_HEADERS,
            json=payload, timeout=10
        )
    if r.status_code not in (200, 201):
        raise HTTPException(r.status_code, f"Jira API error: {r.text}")
    return r.json()

# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.post("/get_issue")
async def get_issue(body: dict, authorization: str = Header(...)):
    """Fetch a live Jira issue by its key (e.g. PROJ-42)."""
    check_scope(authorization, "get_issue")

    issue_id = body.get("issue_id")
    if not issue_id:
        raise HTTPException(400, "Missing 'issue_id' in request body")

    data = await _http_get(f"issue/{issue_id}")

    fields = data.get("fields", {})
    response = {
        "key":      data["key"],
        "summary":  fields.get("summary", ""),
        "status":   (fields.get("status") or {}).get("name", ""),
        "priority": (fields.get("priority") or {}).get("name", ""),
    }

    log_action("jira", "get_issue", body, authorization, "success")
    return response


@app.post("/create_issue")
async def create_issue(body: dict, authorization: str = Header(...)):
    """Create a live Jira issue."""
    check_scope(authorization, "create_issue")

    summary  = body.get("summary", "New issue from MCP")
    priority = body.get("priority", "Medium")
    project  = body.get("project_key", JIRA_PROJECT_KEY)
    issue_type = body.get("issue_type", "Bug")

    payload = {
        "fields": {
            "project":   {"key": project},
            "summary":   summary,
            "issuetype": {"name": issue_type},
            "priority":  {"name": priority},
        }
    }

    # Optional description (Atlassian Document Format)
    if body.get("description"):
        payload["fields"]["description"] = {
            "type": "doc",
            "version": 1,
            "content": [{
                "type": "paragraph",
                "content": [{"type": "text", "text": body["description"]}]
            }]
        }

    data = await _http_post("issue", payload)

    response = {
        "key": data["key"],
        "id":  data["id"],
        "url": f"{JIRA_BASE_URL}/browse/{data['key']}",
    }

    log_action("jira", "create_issue", body, authorization, "success")
    return response


# ── MCP Tool manifest ──────────────────────────────────────────────────────────
@app.get("/tools")
async def list_tools():
    return {
        "tools": [
            {
                "name": "get_issue",
                "description": "Fetch a live Jira issue by key",
                "params": {"issue_id": "string (e.g. PROJ-42)"}
            },
            {
                "name": "create_issue",
                "description": "Create a Jira issue in the configured project",
                "params": {
                    "summary":      "string",
                    "priority":     "string (e.g. High, Medium, Low)",
                    "description":  "string (optional)",
                    "project_key":  f"string (default: {JIRA_PROJECT_KEY})",
                    "issue_type":   "string (default: Bug)"
                }
            }
        ]
    }