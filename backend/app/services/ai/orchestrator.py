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
        
        # Initialize Runtime (async init pattern would be better, but doing sync setup here for now)
        # We need to fetch identity first. 
        self.runtime = None 
        self.pending_mode = mode
        
        # State
        self.is_speaking = False
        # self.interrupt_event = asyncio.Event() # Handled by Governor now
        
        self.governor = SpeechGovernor()
        self.latency_tracker = LatencyTracker(meeting_id)
        
        # Queues
        self.audio_input_queue = asyncio.Queue()
        self.audio_output_queue = asyncio.Queue()

    async def initialize(self):
        """
        Async setup: Load Agent Identity and Config from DB.
        """
        supabase = get_supabase_client()
        
        # Fetch Agent Profile
        agent_resp = supabase.table("agents").select("*").eq("id", self.agent_id).execute()
        if not agent_resp.data:
            print(f"ERROR: Agent {self.agent_id} not found in DB")
            raise ValueError(f"Agent {self.agent_id} not found")
        
        agent_data = agent_resp.data[0]
        print(f"Orchestrator: Loaded Agent {agent_data.get('name')}")
        
        identity = AgentIdentity(
            name=agent_data.get("name"),
            role=agent_data.get("role", "Assistant"),
            years_experience=agent_data.get("years_experience", 0),
            communication_style=agent_data.get("communication_style", "formal"),
            guardrails=agent_data.get("guardrails", {})
        )
        
        self.runtime = AgentRuntime(self.agent_id, identity, self.pending_mode)
        print(f"Agent Runtime initialized in {self.pending_mode} mode for {identity.name}")

    async def ingest_audio(self, audio_data: bytes):
        await self.audio_input_queue.put(audio_data)

    async def audio_generator(self) -> AsyncGenerator[bytes, None]:
        while True:
            chunk = await self.audio_input_queue.get()
            yield chunk

    async def run_pipeline(self):
        """Main Orchestration Loop."""
        if not self.runtime:
            await self.initialize()
            
        print(f"Starting Orchestrator for {self.meeting_id}")

        # Initial Probe & Audible Disclosure
        # "I am an AI Assistant joining this meeting."
        try:
            print(f"Orchestrator: Sending Disclosure for {self.meeting_id}")
            # 1. DB Log
            get_supabase_client().table('meeting_transcripts').insert({
                "meeting_id": self.meeting_id,
                "speaker": "system",
                "content": f"Agent {self.runtime.identity.name} joined in {self.runtime.mode} mode.",
                "confidence": 1.0
            }).execute()
            
            # 2. Audible Announcement (Compliance)
            disclosure_text = f"Hello. I am {self.runtime.identity.name}, an AI assistant. I am recording this session for {self.runtime.mode} purposes."
            print(f"Orchestrator Disclosure Text: {disclosure_text}")

            try:
                get_supabase_client().table('meeting_transcripts').insert({
                    "meeting_id": self.meeting_id,
                    "speaker": "agent",
                    "content": disclosure_text,
                    "confidence": 1.0
                }).execute()
            except Exception as e:
                print(f"WARNING: Failed to save disclosure transcript: {e}")
                # Don't fail the whole pipeline just because of a log error
            
            self.is_speaking = True
            async def announcement_yielder():
                yield disclosure_text
            
            print(f"Orchestrator: Streaming Disclosure TTS...")
            tts_stream = self.tts.speak_stream(announcement_yielder(), self.voice_id)
            chunks_generated = 0
            async for audio_chunk in tts_stream:
                 await self.audio_output_queue.put(audio_chunk)
                 chunks_generated += 1
            print(f"Orchestrator: Disclosure TTS Complete. Generated {chunks_generated} chunks.")
            self.is_speaking = False
            
        except Exception as e: 
            print(f"ERROR: Initialization/Disclosure failed: {e}")
            import traceback
            traceback.print_exc()
            pass
        
        # Start STT Stream
        stt_stream = self.stt.transcribe_stream(self.audio_generator())
        
        async for transcript in stt_stream:
            # 0. Latency Tracking Start
            self.latency_tracker.start_turn()
            
            # 1. VAD & Interruption Check
            # If agent is speaking and user speaks, we interrupt.
            if self.is_speaking and self.governor.should_interrupt(transcript):
                 await self.governor.interrupt()
                 self.is_speaking = False
                 # Clear output queue (best effort)
                 while not self.audio_output_queue.empty():
                    try: self.audio_output_queue.get_nowait()
                    except: pass
                 continue

            if len(transcript) > 5: # Ignore short noise
                # Fire and forget processing to avoid blocking audio loop? 
                # For now, await it to keep conversation turn-based linear.
                await self.process_turn(transcript)

    async def process_turn(self, user_text: str):
        self.governor.clear_interruption()
        self.latency_tracker.mark("stt_complete")
        
        # 1. Update Memory & Transcript
        try:
            get_supabase_client().table('meeting_transcripts').insert({
                "meeting_id": self.meeting_id,
                "speaker": "user",
                "content": user_text,
                "confidence": 1.0
            }).execute()
        except Exception as e:
            print(f"Failed to save user transcript: {e}")

        # 2. RUNTIME EXECUTION (The Brain)
        response_data = await self.runtime.generate_response(user_text, self.meeting_id)
        self.latency_tracker.mark("qbd_complete") # QBD is inside runtime
        self.latency_tracker.mark("llm_start") # LLM is inside runtime
        
        response_text = response_data["text"]
        confidence = response_data["confidence"]
        loop_used = response_data.get("loop_used", "DEEP")
        
        # --- CONVERSATION PACER ---
        # Artificial delay to feel natural
        # Governor decides pacing based on mode
        pause_duration = self.governor.calculate_pause(self.runtime.mode)
        # Fast loop override
        if loop_used == "FAST":
             pause_duration = 0.1
             
        if pause_duration > 0:
            await asyncio.sleep(pause_duration)
        
        # Check interrupt again before speaking
        if self.governor.interrupt_event.is_set():
            return

        # 3. Audit Log
        try:
            get_supabase_client().table('agent_audit_logs').insert({
                "meeting_id": self.meeting_id,
                "agent_id": self.agent_id,
                "question": user_text,
                "answer": response_text,
                "retrieved_sources": json.dumps(response_data["retrieved_sources"]),
                "confidence_score": confidence,
                "decision_path": response_data["decision_path"] + f" ({loop_used})"
            }).execute()
        except Exception as e:
            print(f"Audit log failed: {e}")

        # 4. Speak (if not silent)
        if response_text and response_text.strip():
            self.is_speaking = True
            
            # Save Agent Transcript
            get_supabase_client().table('meeting_transcripts').insert({
                "meeting_id": self.meeting_id,
                "speaker": "agent",
                "content": response_text,
                "confidence": confidence
            }).execute()

            # Stream TTS
            # We wrap the single text response into an iterator for the TTS service
            async def single_text_yielder():
                yield response_text

            tts_stream = self.tts.speak_stream(single_text_yielder(), self.voice_id)
            
            # CLEAR QUEUE ON NEW TURN
            
            first_chunk = True
            async for audio_chunk in tts_stream:
                if first_chunk:
                    self.latency_tracker.mark("tts_first_byte")
                    # Report Latency
                    logger.info(f"Latency Report: {self.latency_tracker.get_report()}")
                    first_chunk = False

                if self.governor.interrupt_event.is_set():
                    # Clear any buffered output
                    while not self.audio_output_queue.empty():
                        try: self.audio_output_queue.get_nowait()
                        except: pass
                    break
                await self.audio_output_queue.put(audio_chunk)
            
            self.is_speaking = False
