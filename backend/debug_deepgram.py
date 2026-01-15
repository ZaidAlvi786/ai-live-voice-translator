
import deepgram
import inspect

try:
    from deepgram import DeepgramClient
    print("Successfully imported DeepgramClient from deepgram")
except ImportError as e:
    print(f"Failed to verify DeepgramClient: {e}")

try:
    from deepgram import LiveTranscriptionEvents
    print("Successfully imported LiveTranscriptionEvents from deepgram")
except ImportError as e:
    print(f"Failed to verify LiveTranscriptionEvents: {e}")

print("\n--- Content of deepgram module ---")
print(dir(deepgram)[:20]) # Print first 20 to check for common exports
