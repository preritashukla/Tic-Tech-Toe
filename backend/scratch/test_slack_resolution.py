import asyncio
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.abspath("."))

from services.integrations.slack_integration import execute_slack, _resolve_channel_id_sync
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()

async def test_resolution():
    token = os.getenv("SLACK_BOT_TOKEN")
    client = WebClient(token=token)
    
    print("Testing _resolve_channel_id_sync...")
    # This should resolve to C0AS582T3B7 based on my earlier verification
    resolved_id = _resolve_channel_id_sync(client, "#verify-live-0414")
    print(f"Resolved #verify-live-0414 to: {resolved_id}")
    
    print("\nTesting execute_slack with channel name...")
    # This calls the full logic with resolution
    result = await execute_slack(
        action="send_message",
        params={"channel": "#verify-live-0414", "message": "Verification: Channel Resolution is WORKING! 🚀"},
        context={}
    )
    print(f"Result Status: {result.get('status')}")
    if result.get('status') == 'success':
        print(f"Message ID (ts): {result['output']['ts']}")

if __name__ == "__main__":
    asyncio.run(test_resolution())
