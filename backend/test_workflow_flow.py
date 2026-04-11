#!/usr/bin/env python3
"""
Quick test script to verify plan -> execute -> status flow
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient() as client:
        # Step 1: Plan
        print("=" * 60)
        print("STEP 1: Creating plan...")
        plan_res = await client.post(
            f"{BASE_URL}/plan",
            json={"user_input": "Create a test workflow"},
        )
        if plan_res.status_code != 200:
            print(f"❌ Plan failed: {plan_res.status_code}")
            print(plan_res.text)
            return
        
        plan_data = plan_res.json()
        dag = plan_data["dag"]
        workflow_id = dag["workflow_id"]
        print(f"✅ Plan created with workflow_id: {workflow_id}")
        print(f"   DAG has {len(dag['nodes'])} nodes")
        
        # Step 2: Execute
        print("\n" + "=" * 60)
        print("STEP 2: Executing DAG...")
        exec_res = await client.post(
            f"{BASE_URL}/execute",
            json={
                "dag": dag,
                "auto_approve": True,
                "dry_run": False
            },
        )
        if exec_res.status_code != 200:
            print(f"❌ Execute failed: {exec_res.status_code}")
            print(exec_res.text)
            return
        
        exec_data = exec_res.json()
        execution_id = exec_data.get("execution_id")
        print(f"✅ Execution started")
        print(f"   execution_id: {execution_id}")
        print(f"   success: {exec_data.get('success')}")
        print(f"   nodes: {exec_data.get('succeeded')}/{exec_data.get('total_nodes')} succeeded")
        
        # Step 3: Status by execution_id
        print("\n" + "=" * 60)
        print(f"STEP 3: Fetching status by execution_id ({execution_id})...")
        status_res = await client.get(f"{BASE_URL}/execute/status?id={execution_id}")
        if status_res.status_code == 200:
            print(f"✅ Found by execution_id")
        else:
            print(f"❌ Not found by execution_id: {status_res.status_code}")
        
        # Step 4: Status by workflow_id
        print("\n" + "=" * 60)
        print(f"STEP 4: Fetching status by workflow_id ({workflow_id})...")
        status_res = await client.get(f"{BASE_URL}/execute/status?id={workflow_id}")
        if status_res.status_code == 200:
            status_data = status_res.json()
            print(f"✅ Found by workflow_id")
            print(f"   execution_id: {status_data.get('execution_id')}")
            print(f"   workflow_id: {status_data.get('workflow_id')}")
            print(f"   status: {status_data.get('status')}")
        else:
            print(f"❌ Not found by workflow_id: {status_res.status_code}")
            print(f"   Response: {status_res.text}")

if __name__ == "__main__":
    asyncio.run(main())
