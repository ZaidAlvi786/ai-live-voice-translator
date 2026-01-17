import os
import json
import asyncio
from typing import AsyncGenerator
from .base import STTService
# In production, use deepgram-sdk. For scaffold, using raw websockets to demonstrate logic.
import websockets

class DeepgramSTTService(STTService):
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        self.base_url = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&smart_format=true&interim_results=true"

    async def transcribe_stream(self, audio_chunk_iterator: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "[System: Deepgram API Key Missing]"
            return

        async with websockets.connect(
            self.base_url, 
            extra_headers={"Authorization": f"Token {self.api_key}"}
        ) as ws:
            
            async def sender():
                try:
                    async for chunk in audio_chunk_iterator:
                        await ws.send(chunk)
                    await ws.send(json.dumps({"type": "CloseStream"}))
                except Exception as e:
                    print(f"STT Sender Error: {e}")

            async def receiver():
                async for msg in ws:
                    try:
                        data = json.loads(msg)
                        # Check for final or interim transcript
                        if 'channel' in data:
                            alternatives = data['channel']['alternatives']
                            if alternatives and alternatives[0]['transcript']:
                                yield alternatives[0]['transcript']
                    except Exception as e:
                        print(f"STT Receiver Error: {e}")

            # Run sender and receiver concurrently
            send_task = asyncio.create_task(sender())
            
            try:
                async for transcript in receiver():
                    yield transcript
            finally:
                send_task.cancel()
