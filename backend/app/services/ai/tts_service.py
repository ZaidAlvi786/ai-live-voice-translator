import os
import json
import asyncio
from typing import AsyncGenerator
import aiohttp
import ssl
import certifi
from .base import TTSService
from ...services.finops_service import finops_service

class ElevenLabsTTSService(TTSService):
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    async def speak_stream(self, text_stream: AsyncGenerator[str, None], voice_id: str, output_format: str = "mp3_44100_128") -> AsyncGenerator[bytes, None]:
        if not self.api_key:
            print("ElevenLabs API Key Missing")
            return
            
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        # ElevenLabs supports pcm_44100, pcm_24000, pcm_16000, etc.
        url = self.base_url.format(voice_id=voice_id) + f"?output_format={output_format}"
        
        # Create SSL context for macOS/certify reliability
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ssl_context)) as session:
            current_sentence = ""
            async for token in text_stream:
                if not token:
                    continue
                current_sentence += token
                if any(p in token for p in [".", "!", "?", "\n"]):
                    payload = {
                        "text": current_sentence,
                        "model_id": "eleven_turbo_v2",
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}
                    }
                    print(f"TTS: Requesting speech ({output_format}) for: {current_sentence[:50]}...")
                    async with session.post(url, json=payload, headers=headers) as resp:
                        if resp.status != 200:
                            print(f"TTS ERROR: ElevenLabs returned {resp.status}: {await resp.text()}")
                        async for chunk in resp.content.iter_any():
                            yield chunk
                    
                    # FinOps Log
                    try:
                        await finops_service.log_cost("session_123", "TTS_CHAR", len(current_sentence), "ElevenLabs")
                    except Exception as e:
                        print(f"TTS FinOps Log Error: {e}")
                    current_sentence = ""
            
            # Flush remainder
            if current_sentence:
                payload = { "text": current_sentence, "model_id": "eleven_turbo_v2" }
                async with session.post(url, json=payload, headers=headers) as resp:
                    async for chunk in resp.content.iter_any():
                         yield chunk
