"""
Direct test: Create GitHub branch 'hello1' + create a Jira issue.
Run with: ..\venv\Scripts\python.exe scratch\test_github_branch.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

async def test_github():
    from agentic_mcp_gateway.github_mcp import handle_github_tool
    print("\n=== TEST: GitHub create_branch 'hello1' ===")
    try:
        result = await handle_github_tool("create_branch", {
            "branch_name": "hello1",
            "from_branch": "main"
        })
        print("SUCCESS:", result)
    except Exception as e:
        print("ERROR:", e)

async def test_jira():
    from services.integrations.jira_integration import execute_jira
    print("\n=== TEST: Jira create_issue ===")
    try:
        result = await execute_jira("create_issue", {
            "summary": "Test issue from frontend",
            "description": "Created via direct test",
            "issue_type": "Task"
        })
        print("SUCCESS:", result)
    except Exception as e:
        print("ERROR:", e)

async def main():
    await test_github()
    await test_jira()

if __name__ == "__main__":
    asyncio.run(main())
