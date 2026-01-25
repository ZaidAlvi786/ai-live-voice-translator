from abc import ABC, abstractmethod
from typing import AsyncGenerator, Any, Dict, Optional

class STTService(ABC):
    """
    Abstract Base Class for Speech-to-Text Services (The Ear).
    """
    @abstractmethod
    async def transcribe_stream(self, audio_chunk_iterator: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        """
        Consumes a stream of raw audio bytes and yields partial/final transcripts.
        """
        pass

class TTSService(ABC):
    """
    Abstract Base Class for Text-to-Speech Services (The Voice).
    """
    @abstractmethod
    async def speak_stream(self, text_stream: AsyncGenerator[str, None], voice_id: str) -> AsyncGenerator[bytes, None]:
        """
        Consumes a stream of text tokens and yields audio bytes (MP3/Opus).
        """
        pass

class LLMService(ABC):
    """
    Abstract Base Class for Reasoning Engines (The Brain).
    """
    @abstractmethod
    async def generate_response(self, context: str, history: list, mode: str) -> AsyncGenerator[str, None]:
        """
        Generates a text response stream based on conversation context.
        """
        pass
        
    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        """
        Raw generation with strict prompt control.
        """
        pass

    @abstractmethod
    async def plan_response(self, context: str, history: list) -> Dict[str, Any]:
        """
        Generates a structured plan (intent, tone, pacing) before speaking.
        """
        pass

class AIService(ABC):
    """
    Base class for generic AI services.
    """
    pass
