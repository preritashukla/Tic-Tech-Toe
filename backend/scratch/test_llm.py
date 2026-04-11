import os
import asyncio
from dotenv import load_dotenv
from services.llm import get_llm_service

async def test():
    load_dotenv()
    try:
        service = get_llm_service()
        print("Service initialized")
        res = await service.generate_dag("test workflow")
        print(f"Result: {res['success']}")
        if not res['success']:
            print(f"Errors: {res['errors']}")
    except Exception as e:
        print(f"Caught exception: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test())
