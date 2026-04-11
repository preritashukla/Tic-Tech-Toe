import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def get_slack_client() -> WebClient:
    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        raise ValueError("SLACK_BOT_TOKEN environment variable not set.")
    return WebClient(token=token)

async def execute_slack(action: str, params: dict, context: dict = None) -> dict:
    """
    Executes a Slack action using the official slack_sdk.
    """
    if context is None:
        context = {}
        
    try:
        client = get_slack_client()
        
        if action == "send_message":
            # For send_message, message template values are already resolved in params by the ContextManager.
            channel = params.get("channel") or os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
            message = params.get("message", "")
            
            response = client.chat_postMessage(channel=channel, text=message)
            return {
                "status": "success",
                "tool": "slack",
                "action": "send_message",
                "output": response.data
            }
            
        elif action == "create_channel":
            name = params.get("name")
            if not name:
                raise ValueError("Channel 'name' is required for create_channel.")
                
            response = client.conversations_create(name=name)
            return {
                "status": "success",
                "tool": "slack",
                "action": "create_channel",
                "output": response.data
            }
            
        else:
            raise ValueError(f"Unsupported Slack action: {action}")
            
    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'response') and isinstance(e.response, dict):
             error_msg = e.response.get("error", str(e))
        return {
            "status": "error",
            "tool": "slack",
            "action": action,
            "error": error_msg
        }
