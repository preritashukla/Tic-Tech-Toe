import os
import sys

print("Current working directory:", os.getcwd())
print("sys.path:", sys.path)

try:
    import models
    print("Found models at:", models.__file__)
    print("models is a package:", hasattr(models, "__path__"))
    
    from models import requests
    print("Imported models.requests successfully")
except Exception as e:
    print("Error importing models:", e)
    import traceback
    traceback.print_exc()
