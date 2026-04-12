import os
import asyncio
import logging
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("mcp_gateway.slack_integration")


def get_slack_client(context: dict = None) -> WebClient:
    # Priority: Context (frontend OAuth) > Env (server default)
    ctx_creds = (context or {}).get("credentials", {}).get("slack", {})
    token = ctx_creds.get("access_token") or ctx_creds.get("token") or os.getenv("SLACK_BOT_TOKEN")
    
    if not token:
        raise ValueError("Slack Credentials Missing: Please connect your Slack account.")
    return WebClient(token=token)


def _send_message_sync(client: WebClient, channel: str, message: str) -> dict:
    """Synchronous send_message — runs inside asyncio.to_thread."""
    try:
        response = client.chat_postMessage(channel=channel, text=message)
        return response.data
    except SlackApiError as e:
        if e.response.get("error") == "not_in_channel":
            # Bot not in channel — try to join first
            try:
                client.conversations_join(channel=channel)
                response = client.chat_postMessage(channel=channel, text=message)
                return response.data
            except SlackApiError as join_err:
                raise Exception(f"Could not join channel {channel}: {join_err.response.get('error', str(join_err))}")
        elif e.response.get("error") == "channel_not_found":
            # Try with # prefix stripped
            stripped = channel.lstrip("#")
            response = client.chat_postMessage(channel=stripped, text=message)
            return response.data
        else:
            raise Exception(f"Slack API error: {e.response.get('error', str(e))}")


def _create_channel_sync(client: WebClient, name: str) -> dict:
    """Synchronous create_channel — runs inside asyncio.to_thread."""
    response = client.conversations_create(name=name)
    return response.data


def _list_channels_sync(client: WebClient) -> dict:
    """Synchronous list_channels — runs inside asyncio.to_thread."""
    response = client.conversations_list(limit=50)
    channels = response.get("channels", [])
    return {
        "channels": [{"id": c["id"], "name": c["name"]} for c in channels],
        "count": len(channels),
    }


async def execute_slack(action: str, params: dict, context: dict = None) -> dict:
    """
    Executes a Slack action using the official slack_sdk.
    All SDK calls are wrapped in asyncio.to_thread since slack_sdk is synchronous.
    """
    if context is None:
        context = {}

    try:
        client = get_slack_client(context)

        if action in ("send_message", "post_message", "notify"):
            channel = (
                params.get("channel")
                or params.get("channel_id")
                or os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
            )
            raw_message = (
                params.get("message")
                or params.get("text")
                or params.get("content", "")
            )

            # Smart Filter for human-readability
            message = str(raw_message)
            import re
            if "summary': '" in message:
                summary_match = re.search(r"summary':\s*'([^']*)'", message)
                if summary_match:
                    message = summary_match.group(1)
            
            message = message.replace("{", "").replace("}", "").replace("'", "")

            if not message:
                raise ValueError("'message' is required for send_message.")

            logger.info(f"Sending Slack message to {channel}: {message[:80]}...")
            
            # CRITICAL: Log to local history for dashboard IMMEDIATELY
            from services.slack_storage import slack_storage
            slack_storage.add_message(channel, message)
            
            output = await asyncio.to_thread(_send_message_sync, client, channel, message)
            return {
                "status": "success",
                "tool": "slack",
                "action": action,
                "output": {
                    "ok": output.get("ok"),
                    "channel": output.get("channel"),
                    "ts": output.get("ts"),
                    "message_text": message[:100],
                },
            }

        elif action == "create_channel":
            name = params.get("name") or params.get("channel_name")
            if not name:
                raise ValueError("'name' is required for create_channel.")

            logger.info(f"Creating Slack channel: {name}")
            output = await asyncio.to_thread(_create_channel_sync, client, name)

            return {
                "status": "success",
                "tool": "slack",
                "action": "create_channel",
                "output": {
                    "channel_id": output.get("channel", {}).get("id"),
                    "channel_name": output.get("channel", {}).get("name"),
                },
            }

        elif action == "list_channels":
            logger.info("Listing Slack channels")
            output = await asyncio.to_thread(_list_channels_sync, client)

            return {
                "status": "success",
                "tool": "slack",
                "action": "list_channels",
                "output": output,
            }

        else:
            raise ValueError(f"Unsupported Slack action: '{action}'. Supported: send_message, create_channel, list_channels")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Slack execution failed [{action}]: {error_msg}")
        return {
            "status": "error",
            "tool": "slack",
            "action": action,
            "error": error_msg,
        }
