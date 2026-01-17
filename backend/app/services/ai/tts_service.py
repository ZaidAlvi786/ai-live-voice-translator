import os
import json
import asyncio
from typing import AsyncGenerator
import aiohttp
from .base import TTSService
from ...services.finops_service import finops_service

class ElevenLabsTTSService(TTSService):
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    async def speak_stream(self, text_stream: AsyncGenerator[str, None], voice_id: str) -> AsyncGenerator[bytes, None]:
        if not self.api_key:
            print("ElevenLabs API Key Missing")
            return
            
        # Optimization: ElevenLabs Websocket is faster, but using HTTP chunking for simplicity in scaffold
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        # In a real streaming implementation, we would buffer text tokens into minimal sentences 
        # before sending to API to optimize latency/cost. 
        # Here we simulate accumulation.
        
        url = self.base_url.format(voice_id=voice_id)
        
        async with aiohttp.ClientSession() as session:
            # We need to send text chunks. 
            # Note: HTTP Streaming doesn't allow streaming *input* easily in standard REST.
            # Production approach: Use ElevenLabs Websockets.
            # For this scaffold, we'll accumulate a small buffer and send.
            
            current_sentence = ""
            async for token in text_stream:
                current_sentence += token
                if token in [".", "!", "?", "\n"]:
                    # Send chunk
                    payload = {
                        "text": current_sentence,
                        "model_id": "eleven_turbo_v2",
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}
                    }
                    async with session.post(url, json=payload, headers=headers) as resp:
                        async for chunk in resp.content.iter_any():
                            yield chunk
                    
                    # FinOps Log
                    await finops_service.log_cost("session_123", "TTS_CHAR", len(current_sentence), "ElevenLabs")
                    current_sentence = ""
            
            # Flush remainder
            if current_sentence:
                payload = { "text": current_sentence, "model_id": "eleven_turbo_v2" }
                async with session.post(url, json=payload, headers=headers) as resp:
                    async for chunk in resp.content.iter_any():
                         yield chunk
