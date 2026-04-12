"""
routers/integrations.py — Integration Verification & Status Endpoints
Tests real connectivity to GitHub, Jira, Slack, and Google Sheets.

GET  /integrations/status  — Returns pre-configured integration status from .env
POST /integrations/verify  — Verifies credentials for a specific tool
"""
from __future__ import annotations
import os
import logging
import asyncio
from typing import Optional
from fastapi import APIRouter
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("mcp_gateway.integrations")

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ─── Data: fetch recent items from all tools ────────────────────────
@router.get("/data")
async def get_combined_data():
    """
    Returns recent activity from GitHub and Jira.
    """
    results = await asyncio.gather(
        _get_recent_github(),
        _get_recent_jira(),
        return_exceptions=True
    )
    
    github_data = results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])}
    jira_data   = results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])}
    
    return {
        "github": github_data,
        "jira": jira_data
    }

async def _get_recent_github():
    import httpx
    token = os.getenv("GITHUB_TOKEN", "")
    repo  = os.getenv("GITHUB_REPO", "")
    if not token or not repo: return {"items": []}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"https://api.github.com/repos/{repo}/commits?per_page=5",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Agentic-MCP-Gateway",
                }
            )
            if res.status_code == 200:
                commits = res.json()
                return {
                    "items": [{
                        "id": c["sha"][:7],
                        "title": c["commit"]["message"].split("\n")[0],
                        "author": c["commit"]["author"]["name"],
                        "date": c["commit"]["author"]["date"],
                        "url": c["html_url"]
                    } for c in commits]
                }
            return {"items": [], "error": res.status_code}
    except Exception as e:
        return {"items": [], "error": str(e)}

async def _get_recent_jira():
    import httpx
    base_url = os.getenv("JIRA_BASE_URL", "")
    email    = os.getenv("JIRA_EMAIL", "")
    token    = os.getenv("JIRA_API_TOKEN", "")
    project  = os.getenv("JIRA_PROJECT_KEY", "")
    
    if not base_url or not email or not token: return {"items": []}
    
    if not base_url.startswith("http"): base_url = f"https://{base_url}"
    
    try:
        jql = f"project = {project} ORDER BY created DESC" if project else "ORDER BY created DESC"
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"{base_url.rstrip('/')}/rest/api/3/search?jql={jql}&maxResults=5",
                auth=(email, token),
                headers={"Accept": "application/json"},
            )
            if res.status_code == 200:
                data = res.json()
                return {
                    "items": [{
                        "id": issue["key"],
                        "title": issue["fields"]["summary"],
                        "status": issue["fields"]["status"]["name"],
                        "date": issue["fields"]["created"],
                        "url": f"{base_url.rstrip('/')}/browse/{issue['key']}"
                    } for issue in data.get("issues", [])]
                }
            return {"items": [], "error": res.status_code}
    except Exception as e:
        return {"items": [], "error": str(e)}


# ─── Status: what's pre-configured in .env ──────────────────────────
@router.get("/status")
async def get_integration_status():
    """
    Returns which integrations are pre-configured via .env variables.
    Frontend uses this to auto-populate tool connection status.
    """
    github_token = os.getenv("GITHUB_TOKEN", "")
    github_repo  = os.getenv("GITHUB_REPO", "")
    slack_token  = os.getenv("SLACK_BOT_TOKEN", "")
    slack_ch     = os.getenv("SLACK_DEFAULT_CHANNEL", "")
    jira_url     = os.getenv("JIRA_BASE_URL", "")
    jira_email   = os.getenv("JIRA_EMAIL", "")
    jira_token   = os.getenv("JIRA_API_TOKEN", "")
    sheets_id    = os.getenv("GOOGLE_SHEETS_ID", "")
    sheets_creds = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON", "")

    return {
        "github": {
            "configured": bool(github_token and github_token != "your_github_token"),
            "repo": github_repo,
            "token_preview": f"...{github_token[-4:]}" if len(github_token) > 4 else "",
        },
        "slack": {
            "configured": bool(slack_token and slack_token.startswith("xoxb-")),
            "channel": slack_ch,
            "token_preview": f"...{slack_token[-4:]}" if len(slack_token) > 4 else "",
        },
        "jira": {
            "configured": bool(jira_url and jira_email and jira_token),
            "base_url": jira_url,
            "email": jira_email,
            "project_key": os.getenv("JIRA_PROJECT_KEY", ""),
        },
        "sheets": {
            "configured": bool(sheets_id),
            "sheet_id": sheets_id,
            "creds_path": sheets_creds,
        },
    }


# ─── Verify: live ping each integration ──────────────────────────────
@router.post("/verify/{tool}")
async def verify_integration(tool: str, body: dict = None):
    """
    POST /integrations/verify/{tool}
    Verifies a specific integration is live and reachable.
    Body is optional — uses .env credentials by default.
    body = { "token": "...", "repo": "...", ... }
    """
    if body is None:
        body = {}

    tool = tool.lower()

    if tool == "github":
        return await _verify_github(body)
    elif tool == "slack":
        return await _verify_slack(body)
    elif tool == "jira":
        return await _verify_jira(body)
    elif tool == "sheets":
        return await _verify_sheets(body)
    else:
        return {"ok": False, "detail": f"Unknown tool: {tool}"}


# ─── GitHub Verify ───────────────────────────────────────────────────
async def _verify_github(body: dict) -> dict:
    import httpx
    token = body.get("token") or os.getenv("GITHUB_TOKEN", "")
    if not token:
        return {"ok": False, "detail": "No GitHub token configured. Set GITHUB_TOKEN in .env"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Agentic-MCP-Gateway",
                }
            )
        if res.status_code == 200:
            data = res.json()
            repo = body.get("repo") or os.getenv("GITHUB_REPO", "")
            return {
                "ok": True,
                "detail": f"Authenticated as @{data.get('login')} ({data.get('name', data.get('login'))})" +
                          (f" — Repo: {repo}" if repo else ""),
                "login": data.get("login"),
                "name": data.get("name"),
                "repo": repo,
            }
        err = res.json().get("message", "Authentication failed")
        return {"ok": False, "detail": f"GitHub API {res.status_code}: {err}"}
    except Exception as e:
        return {"ok": False, "detail": f"GitHub connection error: {str(e)}"}


# ─── Slack Verify ────────────────────────────────────────────────────
async def _verify_slack(body: dict) -> dict:
    import httpx
    token = body.get("token") or os.getenv("SLACK_BOT_TOKEN", "")
    if not token:
        return {"ok": False, "detail": "No Slack token configured. Set SLACK_BOT_TOKEN in .env"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {token}"},
            )
        data = res.json()
        if data.get("ok"):
            channel = os.getenv("SLACK_DEFAULT_CHANNEL", "")
            return {
                "ok": True,
                "detail": f"Connected to Slack workspace: {data.get('team')} as {data.get('user')}",
                "team": data.get("team"),
                "user": data.get("user"),
                "channel": channel,
            }
        return {"ok": False, "detail": f"Slack auth failed: {data.get('error', 'unknown')}"}
    except Exception as e:
        return {"ok": False, "detail": f"Slack connection error: {str(e)}"}


# ─── Jira Verify ─────────────────────────────────────────────────────
async def _verify_jira(body: dict) -> dict:
    import httpx
    base_url = body.get("base_url") or os.getenv("JIRA_BASE_URL", "")
    email    = body.get("email") or os.getenv("JIRA_EMAIL", "")
    token    = body.get("token") or os.getenv("JIRA_API_TOKEN", "")
    project  = os.getenv("JIRA_PROJECT_KEY", "")

    if not base_url or not email or not token:
        return {"ok": False, "detail": "Jira not fully configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env"}

    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"{base_url.rstrip('/')}/rest/api/3/myself",
                auth=(email, token),
                headers={"Accept": "application/json"},
            )
        if res.status_code == 200:
            data = res.json()
            return {
                "ok": True,
                "detail": f"Signed into Jira as {data.get('displayName', email)} ({data.get('emailAddress', email)}), Project: {project}",
                "display_name": data.get("displayName"),
                "email": data.get("emailAddress"),
                "project_key": project,
                "base_url": base_url,
            }
        err_body = {}
        try:
            err_body = res.json()
        except Exception:
            pass
        return {
            "ok": False,
            "detail": f"Jira API {res.status_code}: {err_body.get('message', res.text[:200])}"
        }
    except Exception as e:
        return {"ok": False, "detail": f"Jira connection error: {str(e)}"}


# ─── Google Sheets Verify ────────────────────────────────────────────
async def _verify_sheets(body: dict) -> dict:
    sheet_id   = body.get("sheet_id") or os.getenv("GOOGLE_SHEETS_ID", "")
    creds_env  = body.get("token") or os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON", "credentials/service_account.json")

    if not sheet_id:
        return {"ok": False, "detail": "No Google Sheets ID configured. Set GOOGLE_SHEETS_ID in .env"}

    try:
        import gspread
        from google.oauth2.service_account import Credentials

        def _open_sheet():
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ]
            
            if creds_env and creds_env.strip().startswith("{"):
                import json
                creds_info = json.loads(creds_env)
                creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
            else:
                creds_path = creds_env
                if not os.path.exists(creds_path):
                    raise FileNotFoundError(f"Service account credentials not found at: {creds_path}. Place your service_account.json in the credentials/ folder.")
                creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
                
            client = gspread.authorize(creds)
            spreadsheet = client.open_by_key(sheet_id)
            return spreadsheet

        spreadsheet = await asyncio.to_thread(_open_sheet)
        sheet_title = spreadsheet.title
        worksheets  = [ws.title for ws in spreadsheet.worksheets()]
        return {
            "ok": True,
            "detail": f"Connected to Google Sheet: '{sheet_title}' ({len(worksheets)} sheets: {', '.join(worksheets[:3])})",
            "sheet_title": sheet_title,
            "sheet_id": sheet_id,
            "worksheets": worksheets,
        }
    except Exception as e:
        return {"ok": False, "detail": f"Google Sheets error: {str(e)}"}
