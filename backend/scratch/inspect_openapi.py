import sys
import os
sys.path.insert(0, os.path.abspath("."))
from main import app
import json
print(json.dumps(app.openapi(), indent=2))
