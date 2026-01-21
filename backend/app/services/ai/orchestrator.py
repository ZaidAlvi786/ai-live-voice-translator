import asyncio
from typing import AsyncGenerator
from .stt_service import DeepgramSTTService
from .tts_service import ElevenLabsTTSService
from .llm_service import OpenAILLMService
from .rag_service import RAGService
from app.db.supabase import get_supabase_client

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
        self.rag = RAGService()
        
        # State
        self.is_speaking = False
        self.interrupt_event = asyncio.Event()
        self.processing_task = None
        
        # Queues
        self.audio_input_queue = asyncio.Queue()
        self.text_output_queue = asyncio.Queue()

    # ... (ingest_audio, audio_generator, run_pipeline match existing code) ...

    async def run_pipeline(self):
        """Main Orchestration Loop."""
        print(f"Starting Orchestrator for {self.meeting_id}")
        
        # 1. Start STT Stream
        stt_stream = self.stt.transcribe_stream(self.audio_generator())
        
        async for transcript in stt_stream:
            print(f"Transcript: {transcript}")
            
            # Check for Interrupt if we are speaking
            if self.is_speaking:
                if len(transcript) > 5: 
                    print("INTERRUPT TRIGGERED")
                    self.interrupt_event.set()
                    self.is_speaking = False
            
            if len(transcript) > 2: # Ignore noise
                await self.process_turn(transcript)

    async def process_turn(self, user_text: str):
        self.interrupt_event.clear()
        
        # 1. Update Memory
        await self.memory.add_interaction("user", user_text)

        # DB: Persist User Transcript
        try:
            get_supabase_client().table('meeting_transcripts').insert({
                "meeting_id": self.meeting_id,
                "speaker": "user",
                "content": user_text,
                "confidence": 1.0
            }).execute()
        except Exception as e:
            print(f"Failed to persist user transcript: {e}")
        
        # 2. RAG Retrieval
        rag_context = ""
        try:
            rag_context = await self.rag.query_knowledge(self.agent_id, user_text)
            if rag_context:
                print(f"RAG Context found: {rag_context[:100]}...")
        except Exception as e:
            print(f"RAG Error: {e}")
        
        # 3. Get Context & History
        # We append RAG context to the user's input for the LLM or separate system message
        context = await self.memory.get_context(user_text)
        
        if rag_context:
            context["knowledge"] = rag_context
            
        history = self.memory.get_history_for_llm()
        
        # 4. Plan Response
        # (Mocking cost calculation for now)
        current_cost = 0.01 
        
        plan = await self.llm.plan_response(context, history)
        print(f"Plan: {plan}")
        
        if plan.get("intent") == "listen":
            return # Don't speak
            
        # 5. Generate & Speak
        self.is_speaking = True
        
        # Start Generation Stream
        llm_stream = self.llm.generate_response(context, history, mode="INTERVIEW")
        
        async def text_iterator_wrapper():
            full_response = ""
            async for token in llm_stream:
                if self.interrupt_event.is_set():
                    print("Generation Interrupted")
                    break
                full_response += token
                yield token
            
            if full_response:
                await self.memory.add_interaction("agent", full_response)
                
                # DB: Persist Agent Transcript
                try:
                    get_supabase_client().table('meeting_transcripts').insert({
                        "meeting_id": self.meeting_id,
                        "speaker": "agent",
                        "content": full_response,
                        "confidence": 1.0
                    }).execute()
                    
                    # DB: Update Cost
                    # Note: Ideally we'd upsert based on meeting_id, but for now let's just log it.
                    # Or simple blind update if we assume row creation at start.
                    # get_supabase_client().table('meeting_costs').update({"total_cost": current_cost}).eq("meeting_id", self.meeting_id).execute()
                except Exception as e:
                    print(f"Failed to persist agent transcript: {e}")
        
        tts_stream = self.tts.speak_stream(text_iterator_wrapper(), self.voice_id)
        
        async for audio_chunk in tts_stream:
            if self.interrupt_event.is_set():
                print("TTS Interrupted")
                break
            # Yield this to the WebSocket connection manager (via queue or direct ref)
            # For this scaffold, we just iterate to trigger the TTS generator
            pass
            
        self.is_speaking = False
        
    # ... (get_audio_output_stream) ...

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
