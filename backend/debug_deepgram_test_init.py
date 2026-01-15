
from deepgram import DeepgramClient
import os

# Mock key for testing init
TEST_KEY = "test_key_123"

print("Attempt 1: Positional")
try:
    client = DeepgramClient(TEST_KEY)
    print("Success Positional")
except Exception as e:
    print(f"Failed Positional: {e}")

print("\nAttempt 2: Keyword")
try:
    client = DeepgramClient(api_key=TEST_KEY)
    print("Success Keyword")
except Exception as e:
    print(f"Failed Keyword: {e}")

print("\nAttempt 3: Config Object (Guessing)")
try:
    # Some SDKs use a config object
    client = DeepgramClient({"api_key": TEST_KEY})
    print("Success Config Dict")
except Exception as e:
    print(f"Failed Config Dict: {e}")
