import requests
import json
import os

url = "http://localhost:8000/execute"
with open("test_request.json") as f:
    payload = json.load(f)

print("Sending simulated frontend request...")
response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
print("Response Payload:")
print(json.dumps(response.json(), indent=2))
