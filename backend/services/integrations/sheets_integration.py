import gspread
from google.oauth2.service_account import Credentials
import os
import asyncio
import logging
from typing import Any, Dict, Optional
from dotenv import load_dotenv
load_dotenv()
logger = logging.getLogger("mcp_gateway.sheets_integration")

def get_sheets_client():
    creds_env = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
    
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]

    # Check if creds is a raw JSON string
    if creds_env and creds_env.strip().startswith("{"):
        import json
        try:
            creds_info = json.loads(creds_env)
            creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
            return gspread.authorize(creds)
        except Exception as e:
            raise ValueError(f"Invalid Google Sheets credentials JSON string: {e}")
    
    creds_path = creds_env
    if not creds_path:
        # Default fallback relative to project root
        creds_path = os.path.join(os.getcwd(), "credentials", "service_account.json")
    
    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"Google Sheets credentials not found at: {creds_path}")
    
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    return gspread.authorize(creds)

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

def _append_row_sync(worksheet: gspread.Worksheet, row_data: Any) -> Dict[str, Any]:
    try:
        if isinstance(row_data, list):
            # If the user passed a list, just append it directly
            new_row = [str(item) for item in row_data]
            worksheet.append_row(new_row)
            return {
                "status": "success",
                "output": {"row_data": new_row}
            }

        headers = worksheet.row_values(1)
        new_row = []
        for h in headers:
            key = h.lower().replace(" ", "_")
            # Try different key mappings
            val = row_data.get(key)
            if val is None:
                val = row_data.get(h)
            
            new_row.append(str(val) if val is not None else "")
        
        # If headers are empty or we failed to map ANY keys to the headers, just append raw values
        is_empty_row = all(val == "" for val in new_row)
        if (not headers or is_empty_row) and row_data:
            new_row = [str(v) for v in row_data.values()]

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
        sheet_id = os.getenv("GOOGLE_SHEETS_ID")
        if not sheet_id:
            raise ValueError("GOOGLE_SHEETS_ID not found in environment")
            
        spreadsheet = await asyncio.to_thread(client.open_by_key, sheet_id)
        sheet_name = params.get("sheet_name", "Sheet1")
        if sheet_name and sheet_name.startswith("{{"):
            sheet_name = "Sheet1"
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
            if not row_data and params:
                 # If row_data is empty but params has values, use params as row_data
                 row_data = {k: v for k, v in params.items() if k not in ("sheet_name", "action")}
            
            # Add identifiable test data (timestamp)
            from datetime import datetime
            if isinstance(row_data, dict):
                if "timestamp" not in row_data:
                    row_data["timestamp"] = datetime.now().isoformat()
            
            logger.info(f"Appending row to {sheet_name}: {row_data}")
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
