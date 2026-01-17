from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any

class BotAdapter(ABC):
    """
    Abstract Interface for Meeting Bots (Zoom SDK, WebRTC/Puppeteer, etc.)
    """
    
    @abstractmethod
    async def join_meeting(self, meeting_url: str, identity: Dict[str, str]) -> bool:
        """
        Connects the bot to the meeting platform.
        identity: { "name": "Neuralis AI", "avatar_url": "..." }
        """
        pass

    @abstractmethod
    async def leave_meeting(self):
        """Disconnects and cleans up resources."""
        pass

    @abstractmethod
    async def get_audio_stream(self) -> AsyncGenerator[bytes, None]:
        """
        Yields mixed audio form the meeting (what everyone else is saying).
        Format: PCM 16kHz 16-bit Mono (standard for AI processing).
        """
        pass

    @abstractmethod
    async def push_audio_chunk(self, chunk: bytes):
        """
        Injects AI speech into the meeting.
        """
        pass

    @abstractmethod
    async def get_participants(self) -> list:
        """Returns current participant list."""
        pass
    
    @abstractmethod
    async def set_mute(self, muted: bool):
        """Mute/Unmute self."""
        pass
