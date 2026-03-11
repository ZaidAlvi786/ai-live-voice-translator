import asyncio
import json
from typing import AsyncGenerator
from .stt_service import DeepgramSTTService
from .tts_service import ElevenLabsTTSService
from .agent_runtime import AgentRuntime, AgentIdentity
from .memory_service import MemoryService
from .speech_governor import SpeechGovernor
from .latency_tracker import LatencyTracker
from app.db.supabase import get_supabase_client
import logging

logger = logging.getLogger(__name__)

class AIOrchestrator:
    def __init__(self, meeting_id: str, agent_id: str, voice_id: str, mode: str = "interview"):
        self.meeting_id = meeting_id
        self.agent_id = agent_id
        self.voice_id = voice_id or "21m00Tcm4TlvDq8ikWAM"
        
        # Services
        self.stt = DeepgramSTTService()
        self.tts = ElevenLabsTTSService()
        self.memory = MemoryService(agent_id, meeting_id)
        
        # Runtime
        self.runtime = None 
        self.pending_mode = mode
        
        # State
        self.is_speaking = False
        self.governor = SpeechGovernor()
        self.latency_tracker = LatencyTracker(meeting_id)
        
        # Queues
        self.audio_input_queue = asyncio.Queue()
        self.audio_output_queue = asyncio.Queue()

    async def initialize(self):
        supabase = get_supabase_client()
        agent_resp = supabase.table("agents").select("*").eq("id", self.agent_id).execute()
        if not agent_resp.data:
            raise ValueError(f"Agent {self.agent_id} not found")
        
        agent_data = agent_resp.data[0]
        
        # --- Voice ID Resolution ---
        # If voice_id is an internal model ID (e.g., 'eleven_monolingual_v1'), 
        # we resolve it to the provider's external ID. If not found, assume it's a valid external ID.
        voice_res = supabase.table("voice_models").select("voice_id").eq("id", self.voice_id).execute()
        if voice_res.data and voice_res.data[0].get("voice_id"):
             resolved_voice = voice_res.data[0].get("voice_id")
             logger.info(f"Resolved Voice ID: {self.voice_id} -> {resolved_voice}")
             self.voice_id = resolved_voice
        else:
             logger.info(f"Using provided Voice ID directly (likely a cloned voice): {self.voice_id}")
        # ---------------------------

        identity = AgentIdentity(
            name=agent_data.get("name") or "Agent",
            role=agent_data.get("role") or "Assistant",
            years_experience=agent_data.get("years_experience") or 0,
            communication_style=agent_data.get("communication_style") or "formal",
            guardrails=agent_data.get("guardrails") or {}
        )
        
        self.runtime = AgentRuntime(self.agent_id, identity, self.pending_mode)

    async def ingest_audio(self, audio_data: bytes):
        await self.audio_input_queue.put(audio_data)

    async def audio_generator(self) -> AsyncGenerator[bytes, None]:
        while True:
            chunk = await self.audio_input_queue.get()
            yield chunk

    async def run_pipeline(self, tts_output_format: str = "mp3_44100_128"):
        if not self.runtime:
            await self.initialize()
            
        # Disclosure logic
        try:
            disclosure_text = f"Hello. I am {self.runtime.identity.name}, an AI assistant. I am recording this session for {self.runtime.mode} purposes."
            
            # DB Logs
            get_supabase_client().table('meeting_transcripts').insert([
                {"meeting_id": self.meeting_id, "speaker": "system", "content": f"Agent {self.runtime.identity.name} joined.", "confidence": 1.0},
                {"meeting_id": self.meeting_id, "speaker": "agent", "content": disclosure_text, "confidence": 1.0}
            ]).execute()
            
            self.is_speaking = True
            async def announcement_yielder():
                yield disclosure_text
            
            tts_stream = self.tts.speak_stream(announcement_yielder(), self.voice_id, output_format=tts_output_format)
            async for audio_chunk in tts_stream:
                 await self.audio_output_queue.put(audio_chunk)
            self.is_speaking = False
            
        except Exception as e:
            logger.error(f"Disclosure failed: {e}")
        
        # STT Loop
        stt_stream = self.stt.transcribe_stream(self.audio_generator())
        async for transcript in stt_stream:
            self.latency_tracker.start_turn()
            
            if self.is_speaking and self.governor.should_interrupt(transcript):
                 await self.governor.interrupt()
                 self.is_speaking = False
                 while not self.audio_output_queue.empty():
                    try: self.audio_output_queue.get_nowait()
                    except: pass
                 continue

            if len(transcript) > 5:
                await self.process_turn(transcript, tts_output_format=tts_output_format)

    async def process_turn(self, user_text: str, tts_output_format: str = "mp3_44100_128"):
        self.governor.clear_interruption()
        self.latency_tracker.mark("stt_complete")
        
        # Log user text
        get_supabase_client().table('meeting_transcripts').insert({
            "meeting_id": self.meeting_id, "speaker": "user", "content": user_text, "confidence": 1.0
        }).execute()

        # Brain
        response_data = await self.runtime.generate_response(user_text, self.meeting_id)
        response_text = response_data["text"]
        
        # Pacing
        pause_duration = self.governor.calculate_pause(self.runtime.mode)
        if response_data.get("loop_used") == "FAST":
             pause_duration = 0.1
        if pause_duration > 0:
            await asyncio.sleep(pause_duration)
        
        if self.governor.interrupt_event.is_set():
            return

        # Audit
        get_supabase_client().table('agent_audit_logs').insert({
            "meeting_id": self.meeting_id, "agent_id": self.agent_id,
            "question": user_text, "answer": response_text,
            "retrieved_sources": json.dumps(response_data["retrieved_sources"]),
            "confidence_score": response_data["confidence"],
            "decision_path": response_data["decision_path"]
        }).execute()

        # Speak
        if response_text and response_text.strip():
            self.is_speaking = True
            get_supabase_client().table('meeting_transcripts').insert({
                "meeting_id": self.meeting_id, "speaker": "agent", "content": response_text, "confidence": response_data["confidence"]
            }).execute()

            async def text_yielder():
                yield response_text

            tts_stream = self.tts.speak_stream(text_yielder(), self.voice_id, output_format=tts_output_format)
            
            async for audio_chunk in tts_stream:
                if self.governor.interrupt_event.is_set():
                    break
                await self.audio_output_queue.put(audio_chunk)
            
            self.is_speaking = False
