
from deepgram import AsyncDeepgramClient
import asyncio

async def inspect_async_client():
    TEST_KEY = "test_key_123"
    try:
        client = AsyncDeepgramClient(api_key=TEST_KEY)
        print("AsyncClient created.")
        
        print("\nInspecting client.listen:")
        print(dir(client.listen))
        
        if hasattr(client.listen, 'asynclive'):
             print("\nFound asynclive!")
             print(dir(client.listen.asynclive))
        elif hasattr(client.listen, 'live'):
             print("\nFound live!")
             print(dir(client.listen.live))
             
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(inspect_async_client())
