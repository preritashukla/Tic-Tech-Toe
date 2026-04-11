import os
from dotenv import load_dotenv
import httpx
import asyncio

load_dotenv()

async def test_github():
    token = os.getenv("GITHUB_TOKEN", "")
    repo = os.getenv("GITHUB_REPO", "")
    print(f"Token: {'Set' if token else 'Not Set'}")
    print(f"Repo: {repo}")
    
    if not token or not repo:
        print("Missing credentials")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Agentic-MCP-Gateway",
    }
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.get(f"https://api.github.com/repos/{repo}/commits?per_page=5", headers=headers)
            print(f"Status: {res.status_code}")
            if res.status_code == 200:
                print(f"Success! Found {len(res.json())} commits")
            else:
                print(f"Error: {res.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_github())
