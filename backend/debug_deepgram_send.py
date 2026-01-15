
from deepgram import AsyncDeepgramClient
import asyncio
import inspect

async def inspect_connection_object():
    TEST_KEY = "test_key_123"
    try:
        client = AsyncDeepgramClient(api_key=TEST_KEY)
        
        # We can't easily "connect" without a real websocket handshake potentially failing, 
        # but we can inspect the class if we can import it, or try to get it from the return type hint if possible.
        # Alternatively, we can try to find where AsyncV1SocketClient is defined.
        
        print("Searching for AsyncV1SocketClient in deepgram module...")
        import deepgram
        
        # Recursive search for the class
        def find_class(module, class_name, visited=None):
            if visited is None: visited = set()
            if module in visited: return None
            visited.add(module)
            
            if hasattr(module, class_name):
                return getattr(module, class_name)
            
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if inspect.ismodule(attr) and attr.__name__.startswith('deepgram'):
                   res = find_class(attr, class_name, visited)
                   if res: return res
            return None

        # Try to find the class definitions
        # Based on previous ls, maybe in deepgram.clients.listen.v1.AsyncV1SocketClient?
        
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(inspect_connection_object())
