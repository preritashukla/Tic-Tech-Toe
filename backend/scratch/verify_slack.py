import os
from slack_sdk import WebClient
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("SLACK_BOT_TOKEN")
client = WebClient(token=token)

try:
    auth = client.auth_test()
    print(f"Authenticated as: {auth['user']} (ID: {auth['user_id']}) in Team: {auth['team']} (ID: {auth['team_id']})")
    
    channel_id = os.getenv("SLACK_DEFAULT_CHANNEL")
    info = client.conversations_info(channel=channel_id)
    print(f"Default Channel ({channel_id}): #{info['channel']['name']}")
except Exception as e:
    print(f"Error: {e}")
