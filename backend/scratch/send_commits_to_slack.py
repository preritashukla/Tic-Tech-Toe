import os
import csv
import subprocess
from slack_sdk import WebClient
from dotenv import load_dotenv

def main():
    load_dotenv()
    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        print("Error: SLACK_BOT_TOKEN not found in .env")
        return
    
    channel = os.getenv("SLACK_DEFAULT_CHANNEL", "general")
    
    # Get recent commits via git CLI
    print("Fetching recent commits...")
    result = subprocess.run(
        ["git", "log", "-n", "30", "--pretty=format:%h|%an|%ad|%s", "--date=short"],
        capture_output=True,
        text=True,
        check=True
    )
    
    csv_filename = "recent_commits.csv"
    print(f"Writing to {csv_filename}...")
    with open(csv_filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Commit Hash", "Author", "Date", "Message"])
        for line in result.stdout.strip().split("\n"):
            if line:
                parts = line.split("|", 3)
                writer.writerow(parts)
    
    print("Sending CSV content to Slack due to lack of files:write scope...")
    client = WebClient(token=token)
    
    try:
        with open(csv_filename, "r", encoding="utf-8") as f:
            csv_content = f.read()
            
        message = f"Here is the CSV of recent GitHub commits:\n```{csv_content}```"
            
        response = client.chat_postMessage(
            channel=channel,
            text=message
        )
        print("Upload successful!")
        print("Response:", response.data.get("ok"))
    except Exception as e:
        print(f"Failed to post to Slack: {e}")

if __name__ == "__main__":
    main()
