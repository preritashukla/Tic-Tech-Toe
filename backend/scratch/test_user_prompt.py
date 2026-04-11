import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient(timeout=90) as client:
        print("=== Planning ===")
        r = await client.post("http://localhost:8000/plan", json={
            "user_input": "Create Jira ticket → append row to Google Sheets → notify Slack #all-daiict"
        })
        plan = r.json()
        print("Plan status:", plan.get("success", False))
        if not plan.get("success"):
            print("Errors:", plan.get("errors"))
            return
            
        dag = plan['dag']
        print(json.dumps(dag, indent=2))
        
        print("\n=== Executing ===")
        r2 = await client.post("http://localhost:8000/execute", json={
            "dag": dag, "auto_approve": True, "dry_run": False, "credentials": {}
        })
        result = r2.json()
        print(json.dumps(result.get("results"), indent=2))

asyncio.run(test())
