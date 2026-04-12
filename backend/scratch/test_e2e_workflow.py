import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=60) as client:
        # Test 1: Plan
        print("=== Testing /plan ===")
        r = await client.post("http://localhost:8000/plan", json={"user_input": "Send hello to #all-daiict on Slack"})
        plan = r.json()
        print("Plan success:", plan.get("success"))
        if plan.get("success") and plan.get("dag"):
            dag = plan["dag"]
            print("DAG nodes:", [n["tool"] + "." + n["action"] for n in dag["nodes"]])

            # Test 2: Execute
            print("\n=== Testing /execute ===")
            r2 = await client.post("http://localhost:8000/execute", json={
                "dag": dag, "auto_approve": True, "dry_run": False, "credentials": {}
            })
            result = r2.json()
            print("Execution ID:", result.get("execution_id"))
            print("Succeeded:", result.get("succeeded"), "/", result.get("total_nodes"))
            print("Failed:", result.get("failed"))
            for node_r in result.get("results", []):
                out_keys = list((node_r.get("output") or {}).keys())
                print(f"  [{node_r['status']}] {node_r['tool']}.{node_r['action']} -> output keys: {out_keys}")
                if node_r.get("error"):
                    print(f"    ERROR: {node_r['error']}")
                if node_r.get("output"):
                    print(f"    OUTPUT: {node_r['output']}")
        else:
            print("Errors:", plan.get("errors"))

asyncio.run(test())
