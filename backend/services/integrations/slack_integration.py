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

def _send_file_sync(client: WebClient, channel: str, file_path: str, initial_comment: str = "") -> dict:
    """Synchronous file upload — runs inside asyncio.to_thread."""
    try:
        response = client.files_upload_v2(
            channel=channel,
            file=file_path,
            initial_comment=initial_comment
        )
        return response.data
    except SlackApiError as e:
        if e.response.get("error") == "not_in_channel":
            try:
                client.conversations_join(channel=channel)
                response = client.files_upload_v2(channel=channel, file=file_path, initial_comment=initial_comment)
                return response.data
            except SlackApiError as join_err:
                raise Exception(f"Could not join channel {channel}: {join_err.response.get('error', str(join_err))}")
        elif e.response.get("error") == "channel_not_found":
            stripped = channel.lstrip("#")
            response = client.files_upload_v2(channel=stripped, file=file_path, initial_comment=initial_comment)
            return response.data
        else:
            raise Exception(f"Slack API error: {e.response.get('error', str(e))}")


def _create_channel_sync(client: WebClient, name: str) -> dict:
    """Synchronous create_channel — runs inside asyncio.to_thread."""
    response = client.conversations_create(name=name)
    return response.data


def _list_channels_sync(client: WebClient) -> dict:
    """Synchronous list_channels — runs inside asyncio.to_thread."""
    response = client.conversations_list(limit=200, types="public_channel,private_channel")
    channels = response.get("channels", [])
    return {
        "channels": [{"id": c["id"], "name": c["name"]} for c in channels],
        "count": len(channels),
    }


def _resolve_channel_id_sync(client: WebClient, channel_name: str) -> str:
    """Resolves a channel name (e.g. #general) to an ID (e.g. C12345)."""
    name = channel_name.lstrip("#")
    response = client.conversations_list(limit=1000, types="public_channel,private_channel")
    for channel in response.get("channels", []):
        if channel["name"] == name:
            return channel["id"]
    return channel_name  # Fallback to original if not found (might already be an ID)


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

            # --- CHANNEL RESOLUTION ---
            if str(channel).startswith("#"):
                logger.info(f"Resolving Slack channel name: {channel}")
                resolved_id = await asyncio.to_thread(_resolve_channel_id_sync, client, channel)
                if resolved_id != channel:
                    logger.info(f"Resolved {channel} to {resolved_id}")
                    channel = resolved_id

            # Auto-inject links from recent context to fulfill user intent implicitly
            links = []
            results_ctx = (context or {}).get("results", {})
            if results_ctx:
                for out in results_ctx.values():
                    if isinstance(out, dict):
                        if "branch_html_url" in out: links.append(f"Branch: {out['branch_html_url']}")
                        elif "branch_url" in out: links.append(f"Branch API: {out['branch_url']}")
                        if "url" in out and "browse" in out["url"]: links.append(f"Jira Ticket: {out['url']}")
                        if "pr_url" in out: links.append(f"Pull Request: {out['pr_url']}")
                        if "issue_url" in out: links.append(f"Issue: {out['issue_url']}")
            
            if links:
                added = "\n\nRelated Resources:\n" + "\n".join(set(links))
                if added.strip() not in message:
                    message += added

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

        elif action in ("send_file", "upload_file"):
            channel = (
                params.get("channel")
                or params.get("channel_id")
                or os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
            )
            file_path = params.get("file_path") or params.get("file")
            initial_comment = params.get("message") or params.get("initial_comment") or params.get("text") or ""
            
            if not file_path:
                raise ValueError("'file_path' is required for send_file.")
            
            # Simple check if path exists relative to current working directory or absolute
            if not os.path.exists(file_path):
                # Perhaps it's in the backend root
                backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                test_path = os.path.join(backend_root, os.path.basename(file_path))
                if os.path.exists(test_path):
                    file_path = test_path
                else:
                    raise ValueError(f"File not found: {file_path}")

            # Auto-inject links into the comment just like send_message
            links = []
            results_ctx = (context or {}).get("results", {})
            if results_ctx:
                for out in results_ctx.values():
                    if isinstance(out, dict):
                        if "branch_html_url" in out: links.append(f"Branch: {out['branch_html_url']}")
                        elif "branch_url" in out: links.append(f"Branch API: {out['branch_url']}")
                        if "url" in out and "browse" in out["url"]: links.append(f"Jira Ticket: {out['url']}")
                        if "pr_url" in out: links.append(f"Pull Request: {out['pr_url']}")
                        if "issue_url" in out: links.append(f"Issue: {out['issue_url']}")
            
            if links:
                added = "\n\nRelated Resources:\n" + "\n".join(set(links))
                if added.strip() not in initial_comment:
                    initial_comment += added

            logger.info(f"Uploading file {file_path} to Slack channel {channel}...")
            output = await asyncio.to_thread(_send_file_sync, client, channel, file_path, initial_comment)

            return {
                "status": "success",
                "tool": "slack",
                "action": action,
                "output": {
                    "ok": output.get("ok"),
                    "file_id": output.get("file", {}).get("id") if output.get("file") else None,
                    "channel_id": channel,
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
            raise ValueError(f"Unsupported Slack action: '{action}'. Supported: send_message, send_file, create_channel, list_channels")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Slack execution failed [{action}]: {error_msg}")
        return {
            "status": "error",
            "tool": "slack",
            "action": action,
            "error": error_msg,
        }
