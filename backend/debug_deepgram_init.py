
from deepgram import DeepgramClient
import inspect

try:
    print("Inspecting DeepgramClient.__init__ signature:")
    print(inspect.signature(DeepgramClient.__init__))
except Exception as e:
    print(f"Could not inspect signature: {e}")

try:
    print("\nInspecting DeepgramClient docstring:")
    print(DeepgramClient.__doc__)
except Exception as e:
    print(f"Could not inspect docstring: {e}")
