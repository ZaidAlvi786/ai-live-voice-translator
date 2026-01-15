
from deepgram import DeepgramClient
import inspect

TEST_KEY = "test_key_123"
try:
    client = DeepgramClient(api_key=TEST_KEY)
    
    print("\nInspecting client.listen.v1.connect signature:")
    try:
        print(inspect.signature(client.listen.v1.connect))
    except Exception as e:
         print(f"Error: {e}")

except Exception as e:
    print(f"Error: {e}")
