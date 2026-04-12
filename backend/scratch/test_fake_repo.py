import asyncio
from agentic_mcp_gateway.github_mcp import handle_github_tool

async def main():
    try:
        res = await handle_github_tool("list_commits", {"owner": "preritashukla", "repo": "this-repo-does-not-exist-12345"})
        print(f"SUCCESS: {res}")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(main())
