
from deepgram import DeepgramClient
import os

TEST_KEY = "test_key_123"
try:
    client = DeepgramClient(api_key=TEST_KEY)
    
    print("\nInspecting client.listen.live (property access):")
    try:
        print(dir(client.listen.live))
        print("Found client.listen.live")
    except AttributeError:
        print("client.listen.live does not exist")
        
    print("\nInspecting client.listen (property access for 'rest'):")
    # v3 usually has .rest and .live
    try:
        print(dir(client.listen.rest))
        print("Found client.listen.rest")
    except AttributeError:
        print("client.listen.rest does not exist")

    print("\nInspecting client.listen.v('1'):")
    try:
         v1 = client.listen.v("1")
         print(dir(v1))
    except Exception as e:
         print(f"Error accessing v('1'): {e}")

except Exception as e:
    print(f"Error: {e}")
