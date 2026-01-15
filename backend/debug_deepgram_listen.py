
from deepgram import DeepgramClient
import os

TEST_KEY = "test_key_123"
try:
    client = DeepgramClient(api_key=TEST_KEY)
    print("Client created.")
    
    print("\nInspecting client.listen:")
    print(dir(client.listen))
    
    if hasattr(client.listen, 'live'):
        print("\nInspecting client.listen.live:")
        print(dir(client.listen.live))
        
    if hasattr(client.listen, 'asynclive'):
        print("\nInspecting client.listen.asynclive:")
        print(dir(client.listen.asynclive))

except Exception as e:
    print(f"Error: {e}")
