import asyncio
from services.integrations.sheets_integration import execute_sheets
print(asyncio.run(execute_sheets('append_row', {'row_data': {'test': 'data'}})))
