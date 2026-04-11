import requests

data = {
    "dag": {
        "workflow_name": "Test",
        "nodes": [
            {
                "id": "node_1",
                "tool": "jira",
                "action": "get_issues",
                "params": {}
            }
        ]
    }
}

r = requests.post("http://127.0.0.1:8000/plan/validate", json=data)
print("Status:", r.status_code)
print("Response:", r.text)
