from fastapi.testclient import TestClient
import os
import sys
sys.path.insert(0, os.path.abspath("."))
from main import app

client = TestClient(app)
response = client.post("/plan", json={"user_input": "Test 123456789"})
print(response.status_code)
print(response.json())
