
from deepgram import AsyncDeepgramClient
import asyncio
import inspect

async def inspect_async_client_connect():
    TEST_KEY = "test_key_123"
    try:
        client = AsyncDeepgramClient(api_key=TEST_KEY)
        
        print("\nInspecting AsyncDeepgramClient.listen.v1.connect signature:")
        try:
             print(inspect.signature(client.listen.v1.connect))
        except Exception as e:
             print(f"Error: {e}")

    except Exception as e:
        print(f"Error: {e}")

asyncio.run(inspect_async_client_connect())
