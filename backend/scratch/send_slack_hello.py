import asyncio
import sys
import os

# Add the backend directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.integrations.slack_integration import execute_slack

async def main():
    print("Sending 'hello' to Slack...")
    
    # We'll use the default channel from .env if not specified
    # Or we can specify one. Let's see if we can find the channel in .env
    
    params = {
        "channel": "#all-daiict",
        "message": "hello from Antigravity!"
    }
    
    result = await execute_slack("send_message", params)
    
    if result["status"] == "success":
        print(f"Success! Message sent to channel: {result['output']['channel']}")
        print(f"Timestamp: {result['output']['ts']}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    asyncio.run(main())
