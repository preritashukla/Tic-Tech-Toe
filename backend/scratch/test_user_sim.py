import requests
import json

print("1. Planning Workflow...")
res = requests.post("http://localhost:8000/api/plan", json={
    "user_input": "Fetch the latest commits from preritashukla/this-repo-does-not-exist-12345",
    "context": {"history": []}
}, headers={"Content-Type": "application/json"})
plan_data = res.json()
print("DAG JSON:", json.dumps(plan_data.get("dag"), indent=2))

if plan_data.get("dag"):
    print("\n2. Executing Workflow...")
    exec_res = requests.post("http://localhost:8000/api/execute", json={
        "dag": plan_data["dag"],
        "auto_approve": True,
        "dry_run": False,
        "credentials": {}
    })
    print("EXEC RESULT:", json.dumps(exec_res.json(), indent=2))
