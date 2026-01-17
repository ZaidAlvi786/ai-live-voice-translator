import asyncio
from typing import AsyncGenerator
from .stt_service import DeepgramSTTService
from .tts_service import ElevenLabsTTSService
from .llm_service import OpenAILLMService
from .memory_service import MemoryService

class AIOrchestrator:
    def __init__(self, meeting_id: str, agent_id: str, voice_id: str):
        self.meeting_id = meeting_id
        self.agent_id = agent_id
        self.voice_id = voice_id or "21m00Tcm4TlvDq8ikWAM" # Default voice
        
        # Services
        self.stt = DeepgramSTTService()
        self.tts = ElevenLabsTTSService()
        self.llm = OpenAILLMService()
        self.memory = MemoryService(agent_id, meeting_id)
        
        # State
        self.is_speaking = False
        self.interrupt_event = asyncio.Event()
        self.processing_task = None
        
        # Queues
        self.audio_input_queue = asyncio.Queue()
        self.text_output_queue = asyncio.Queue()

    async def ingest_audio(self, chunk: bytes):
        """Entry point for incoming audio bytes from WebSocket."""
        await self.audio_input_queue.put(chunk)

    async def audio_generator(self) -> AsyncGenerator[bytes, None]:
        while True:
            chunk = await self.audio_input_queue.get()
            yield chunk

    async def run_pipeline(self):
        """Main Orchestration Loop."""
        print(f"Starting Orchestrator for {self.meeting_id}")
        
        # 1. Start STT Stream
        stt_stream = self.stt.transcribe_stream(self.audio_generator())
        
        async for transcript in stt_stream:
            print(f"Transcript: {transcript}")
            
            # Check for Interrupt if we are speaking
            if self.is_speaking:
                # Simple logic: If user says something substantial, interrupt.
                if len(transcript) > 5: 
                    print("INTERRUPT TRIGGERED")
                    self.interrupt_event.set()
                    self.is_speaking = False
                    # Drain TTS queue logic would go here
            
            # If prompt (this is a simplified logic, normally we wait for VAD silence)
            # For this scaffold, we process every final transcript chunk as a turn.
            if len(transcript) > 2: # Ignore noise
                await self.process_turn(transcript)

    async def process_turn(self, user_text: str):
        self.interrupt_event.clear()
        
        # 1. Update Memory
        await self.memory.add_interaction("user", user_text)
        
        # 2. Get Context
        context = await self.memory.get_context(user_text)
        history = self.memory.get_history_for_llm()
        
        # 3. Plan Response
        plan = await self.llm.plan_response(context, history)
        print(f"Plan: {plan}")
        
        if plan.get("intent") == "listen":
            return # Don't speak
            
        # 4. Generate & Speak
        self.is_speaking = True
        
        # Start Generation Stream
        llm_stream = self.llm.generate_response(context, history, mode="INTERVIEW")
        
        # We need to fork the stream: one to TTS, one to Memory/Log
        # For simplicity, we'll accumulate text for memory while streaming to TTS.
        
        async def text_iterator_wrapper():
            full_response = ""
            async for token in llm_stream:
                if self.interrupt_event.is_set():
                    print("Generation Interrupted")
                    break
                full_response += token
                yield token
            
            # Generation complete (or interrupted)
            if full_response:
                await self.memory.add_interaction("agent", full_response)
        
        tts_stream = self.tts.speak_stream(text_iterator_wrapper(), self.voice_id)
        
        async for audio_chunk in tts_stream:
            if self.interrupt_event.is_set():
                print("TTS Interrupted")
                break
            # Yield this to the WebSocket Sender
            yield audio_chunk
            
        self.is_speaking = False

    async def get_audio_output_stream(self):
        """
        Since process_turn yields audio, we need a way to consume it.
        The current architecture implies `process_turn` is triggered by `ingest_audio` loop.
        But `process_turn` is async. We need to decouple the output stream.
        
        Refactoring: `process_turn` puts chunks into `self.text_output_queue` or `self.audio_output_queue`.
        """
        # Note: This is a simplified scaffold. A robust production implementation uses
        # dedicated producer-consumer tasks for optimal concurrency.
        pass
