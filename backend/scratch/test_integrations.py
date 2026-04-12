import sys, os, asyncio
sys.path.insert(0, r'd:\tic tac toe\backend')
os.chdir(r'd:\tic tac toe\backend')

from routers.integrations import _verify_github, _verify_slack, _verify_jira, _verify_sheets

async def run_tests():
    print("=== LIVE INTEGRATION TESTS ===")

    r = await _verify_github({})
    status = "OK  " if r["ok"] else "FAIL"
    print(f"GitHub:  [{status}] {r['detail']}")

    r = await _verify_slack({})
    status = "OK  " if r["ok"] else "FAIL"
    print(f"Slack:   [{status}] {r['detail']}")

    r = await _verify_jira({})
    status = "OK  " if r["ok"] else "FAIL"
    print(f"Jira:    [{status}] {r['detail']}")

    r = await _verify_sheets({})
    status = "OK  " if r["ok"] else "FAIL"
    print(f"Sheets:  [{status}] {r['detail']}")

asyncio.run(run_tests())
