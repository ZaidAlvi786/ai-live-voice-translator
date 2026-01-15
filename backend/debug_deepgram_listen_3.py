
from deepgram import DeepgramClient
import os

TEST_KEY = "test_key_123"
try:
    client = DeepgramClient(api_key=TEST_KEY)
    
    print("\nInspecting client.listen.v1:")
    try:
        print(dir(client.listen.v1))
    except Exception as e:
        print(f"Error accessing listen.v1: {e}")

except Exception as e:
    print(f"Error: {e}")
