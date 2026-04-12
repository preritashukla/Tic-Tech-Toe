import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=90) as client:
        print("=== Testing Google Sheets Workflow ===")
        r = await client.post("http://localhost:8000/plan", json={
            "user_input": "Append a new row to Google Sheets with name 'Test User' and status 'Active'"
        })
        plan = r.json()
        print("Plan success:", plan.get("success"))
        if not plan.get("success"):
            print("ERRORS:", plan.get("errors"))
            return

        dag = plan["dag"]
        print("DAG:", [n["tool"] + "." + n["action"] for n in dag["nodes"]])

        print("\n=== Executing ===")
        r2 = await client.post("http://localhost:8000/execute", json={
            "dag": dag, "auto_approve": True, "dry_run": False, "credentials": {}
        })
        result = r2.json()
        print(f"Succeeded: {result.get('succeeded')}/{result.get('total_nodes')} | Failed: {result.get('failed')}")
        for node_r in result.get("results", []):
            status = node_r["status"]
            tool   = node_r["tool"]
            action = node_r["action"]
            output = node_r.get("output") or {}
            error  = node_r.get("error")
            print(f"\n  [{status}] {tool}.{action}")
            if output:
                print(f"    OUTPUT: {output}")
            if error:
                print(f"    ERROR: {error}")

asyncio.run(test())
