import asyncio
from typing import Dict, Optional
from .bot_adapter import BotAdapter
from .turn_taker import TurnTaker
from .adapters.webrtc_adapter import WebRTCAdapter
# from .adapters.zoom_native import ZoomNativeAdapter (Future)

class MockAdapter(BotAdapter):
    """Temporary mock for scaffolding."""
    async def join_meeting(self, url, identity): return True
    async def leave_meeting(self): pass
    async def get_audio_stream(self): 
        while True: yield b'\x00' * 1024; await asyncio.sleep(0.01) # Silence
    async def push_audio_chunk(self, chunk): pass
    async def get_participants(self): return []
    async def set_mute(self, muted): pass

class MeetingSessionManager:
    def __init__(self):
        # meeting_id -> { adapter: BotAdapter, turn_taker: TurnTaker, task: Task }
        self.sessions: Dict[str, Dict] = {}

    async def start_session(self, meeting_url: str, bot_name: str) -> str:
        """
        Spawns a new bot instance for a meeting.
        """
        session_id = f"session_{len(self.sessions) + 1}"
        
        # 1. Select Adapter Strategy (Hybrid Logic)
        # if "zoom" in meeting_url: adapter = ZoomNativeAdapter() ...
        # else: adapter = WebRTCAdapter()
        adapter = MockAdapter() 

        # 2. Join
        success = await adapter.join_meeting(meeting_url, {"name": bot_name})
        if not success:
            raise Exception("Failed to join meeting")

        # 3. Init Logic
        turn_taker = TurnTaker()
        
        self.sessions[session_id] = {
            "adapter": adapter,
            "turn_taker": turn_taker,
            "status": "active"
        }
        
        print(f"Session {session_id} started for {meeting_url}")
        return session_id

    async def end_session(self, session_id: str):
        if session_id in self.sessions:
            await self.sessions[session_id]["adapter"].leave_meeting()
            del self.sessions[session_id]
            print(f"Session {session_id} ended")

    def get_session(self, session_id: str):
        return self.sessions.get(session_id)

manager = MeetingSessionManager()
