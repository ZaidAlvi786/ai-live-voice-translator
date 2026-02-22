import asyncio
import websockets
import sys

async def test_ws(meeting_id):
    uri = f"ws://localhost:8000/api/v1/ws/{meeting_id}"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Sending test data (simulated audio bytes)...")
            
            # Send dummy bytes to trigger orchestrator
            await websocket.send(b"\x00\x00\x00\x00")
            
            print("Waiting for response from server...")
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    if isinstance(response, str):
                        print(f"Received Text: {response}")
                    else:
                        print(f"Received {len(response)} bytes of audio data.")
            except asyncio.TimeoutError:
                print("No message received for 10 seconds. Terminating.")
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    m_id = sys.argv[1] if len(sys.argv) > 1 else "test-meeting"
    asyncio.run(test_ws(m_id))
