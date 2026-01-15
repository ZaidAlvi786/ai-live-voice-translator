
import deepgram
import inspect

print("Searching for 'Events' in deepgram...")
events = [x for x in dir(deepgram) if 'Events' in x]
print(events)

print("\nSearching for 'Options' in deepgram...")
options = [x for x in dir(deepgram) if 'Options' in x]
print(options)

print("\nSearching for 'Client' in deepgram...")
clients = [x for x in dir(deepgram) if 'Client' in x]
print(clients)
