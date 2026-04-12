import asyncio
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.abspath("."))

from agentic_mcp_gateway.github_mcp import handle_github_tool

async def test_master_repo():
    print("Test 1: No repository provided (should default to master)")
    try:
        res = await handle_github_tool("get_repository", {})
        print(f"✅ Success: {res.get('repo_full_name')}")
    except Exception as e:
        print(f"❌ Failed: {e}")

    print("\nTest 2: Correct repository provided")
    try:
        res = await handle_github_tool("get_repository", {"owner": "preritashukla", "repo": "Tic-Tech-Toe"})
        print(f"✅ Success: {res.get('repo_full_name')}")
    except Exception as e:
        print(f"❌ Failed: {e}")

    print("\nTest 3: Incorrect repository provided")
    try:
        await handle_github_tool("get_repository", {"owner": "google", "repo": "foo-repo"})
        print("❌ Failed: Should have raised an error but didn't")
    except Exception as e:
        print(f"✅ Correctly Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_master_repo())
