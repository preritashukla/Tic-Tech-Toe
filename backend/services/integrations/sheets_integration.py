import gspread
from google.oauth2.service_account import Credentials
import os
import asyncio
import logging
from typing import Any, Dict, Optional
from dotenv import load_dotenv
load_dotenv()
logger = logging.getLogger("mcp_gateway.sheets_integration")

def get_sheets_client(context: Optional[Dict] = None):
    # Priority 1: User OAuth Token (from context)
    ctx_creds = (context or {}).get("credentials", {}).get("sheets", {}) or (context or {}).get("credentials", {}).get("google", {})
    oauth_token = ctx_creds.get("access_token") or ctx_creds.get("token")
    
    if oauth_token:
        from google.oauth2.credentials import Credentials as OAuthCredentials
        creds = OAuthCredentials(token=oauth_token)
        logger.info("Sheets API: Using user OAuth token")
        return gspread.authorize(creds)

    # Priority 2: Service Account (from env)
    creds_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
    if not creds_path:
        creds_path = os.path.join(os.getcwd(), "credentials", "service_account.json")
    
    if os.path.exists(creds_path):
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
        logger.info("Sheets API: Using service account credentials")
        return gspread.authorize(creds)

    raise Exception("Google Sheets Credentials Missing: Please connect your Google account.")

def _read_row_sync(worksheet: gspread.Worksheet, row_key: str) -> Dict[str, Any]:
    try:
        cell = worksheet.find(row_key, in_column=1)
        if cell:
            row_data = worksheet.row_values(cell.row)
            return {
                "status": "success",
                "output": {"row": cell.row, "values": row_data}
            }
        return {"status": "error", "error": f"Row key '{row_key}' not found"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def _update_row_sync(worksheet: gspread.Worksheet, row_key: str, status: str) -> Dict[str, Any]:
    try:
        cell = worksheet.find(row_key, in_column=1)
        if cell:
            headers = [h.lower() for h in worksheet.row_values(1)]
            try:
                status_col = headers.index("status") + 1
            except ValueError:
                return {"status": "error", "error": "Column 'status' not found in headers"}
            
            worksheet.update_cell(cell.row, status_col, status)
            return {
                "status": "success",
                "output": {"row": cell.row, "updated_to": status}
            }
        return {"status": "error", "error": f"Row key '{row_key}' not found"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def _append_row_sync(worksheet: gspread.Worksheet, row_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        headers = worksheet.row_values(1)
        new_row = []
        for h in headers:
            key = h.lower().replace(" ", "_")
            # Try different key mappings
            val = row_data.get(key)
            if val is None:
                val = row_data.get(h)
            
            new_row.append(str(val) if val is not None else "")
        
        # If headers are empty or new_row is empty, use raw values if possible or just append
        if not new_row and row_data:
            new_row = list(row_data.values())

        worksheet.append_row(new_row)
        return {
            "status": "success",
            "output": {"row_data": new_row}
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

async def execute_sheets(action: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main entry point for Google Sheets operations.
    Bridges the async executor with synchronous gspread calls.
    """
    try:
        client = await asyncio.to_thread(get_sheets_client)
        sheet_id = ctx_creds.get("spreadsheet_id") or os.getenv("GOOGLE_SHEETS_ID")
        if not sheet_id:
            raise ValueError("Spreadsheet ID Missing: Please provide a Spreadsheet ID in the 'Connect Tools' dashboard.")
            
        spreadsheet = await asyncio.to_thread(client.open_by_key, sheet_id)
        sheet_name = params.get("sheet_name", "Sheet1")
        worksheet = await asyncio.to_thread(spreadsheet.worksheet, sheet_name)
        
        result = None
        if action == "read_row":
            row_key = params.get("row_key")
            result = await asyncio.to_thread(_read_row_sync, worksheet, row_key)
        
        elif action == "update_row":
            row_key = params.get("row_key")
            status = params.get("status")
            result = await asyncio.to_thread(_update_row_sync, worksheet, row_key, status)
            
        elif action == "append_row":
            row_data = params.get("row_data", {})
            result = await asyncio.to_thread(_append_row_sync, worksheet, row_data)
            
        else:
            return {
                "status": "error",
                "tool": "sheets",
                "action": action,
                "error": f"Unknown action: {action}"
            }

        # Add common fields to result
        result["tool"] = "sheets"
        result["action"] = action
        return result

    except Exception as e:
        logger.error(f"Sheets execution failed: {e}")
        return {
            "status": "error",
            "tool": "sheets",
            "action": action,
            "error": str(e) if str(e) else type(e).__name__
        }
