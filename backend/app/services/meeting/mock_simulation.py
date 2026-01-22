import asyncio
import random
from datetime import datetime
from app.db.supabase import get_supabase_client

class MockMeetingSimulation:
    """
    Simulates a live external meeting (Zoom/Meet) life-cycle for demo purposes.
    It generates fake user questions and agent responses to populate the transcript.
    """

    @staticmethod
    async def start(meeting_id: str, agent_name: str, platform: str):
        print(f"[Simulation] Starting mock meeting {meeting_id} on {platform} with {agent_name}")
        supabase = get_supabase_client()
        
        try:
            # 1. Simulate Connection Delay (Connecting...)
            print(f"[Simulation] Connecting to {platform}...")
            await asyncio.sleep(2) 
            
            # 2. Simulate Waiting for Host
            # We could push a system message here if the schema supports it
            await MockMeetingSimulation._push_transcript(supabase, meeting_id, "system", f"Connecting to {platform} servers...")
            await asyncio.sleep(1.5)
            await MockMeetingSimulation._push_transcript(supabase, meeting_id, "system", "Waiting for host to admit agent...")
            await asyncio.sleep(2)

            # 3. Join & Go Live
            print(f"[Simulation] Joined! Session Live.")
            await MockMeetingSimulation._push_transcript(supabase, meeting_id, "system", "Connected. Session is being recorded.")
            
            # 4. Conversation Loop
            # Define a script of "User" questions and vague "Agent" answers
            script = [
                {
                    "speaker": "user", 
                    "text": "Hi there, can you hear me okay?", 
                    "delay": 1
                },
                {
                    "speaker": "agent", 
                    "text": f"Yes, I hear you clearly. I am {agent_name}, an AI agent designated for this meeting. I am ready to assist.", 
                    "delay": 2
                },
                {
                    "speaker": "user", 
                    "text": "Great. I wanted to discuss the technical architecture for the new project.", 
                    "delay": 4
                },
                {
                    "speaker": "agent", 
                    "text": "Understood. I have context on the project specs. Are we focusing on scalability or security first?", 
                    "delay": 2
                },
                {
                    "speaker": "user", 
                    "text": "Let's start with scalability. We expect high concurrency.", 
                    "delay": 5
                },
                {
                    "speaker": "agent", 
                    "text": "Noted. For high concurrency, I recommend a horizontally scalable microservices pattern, ideally orchestrated via Kubernetes.", 
                    "delay": 3
                },
                {
                    "speaker": "user", 
                    "text": "That sounds right. What about database bottlenecks?", 
                    "delay": 4
                },
                {
                    "speaker": "agent", 
                    "text": "We should implement aggressive caching with Redis and consider read-replicas for the PostgreSQL cluster.", 
                    "delay": 3
                },
                 {
                    "speaker": "user", 
                    "text": "Okay, let's move to the timeline.", 
                    "delay": 3
                }
            ]

            total_tokens = 0
            accumulated_cost = 0.0

            for line in script:
                # Check if meeting is still active before proceeding
                # In a real app we'd poll DB, but for this simulation loop getting killed is handled by the async task cancellation usually, 
                # or we just let it run its course for the demo minute.
                # Let's do a quick check? 
                # (Skipping DB check for speed, relying on user to manually stop or just let script finish)
                
                await asyncio.sleep(line["delay"])
                
                # Push Transcript
                await MockMeetingSimulation._push_transcript(supabase, meeting_id, line["speaker"], line["text"])
                
                # Simulate Cost Update (Fake tokens)
                new_tokens = len(line["text"].split()) * 1.5 # rough estimate
                total_tokens += int(new_tokens)
                accumulated_cost += (new_tokens * 0.00002) # approx GPT-4o-mini pricing
                
                await MockMeetingSimulation._update_cost(supabase, meeting_id, total_tokens, accumulated_cost)

            # End of Script
            await MockMeetingSimulation._push_transcript(supabase, meeting_id, "system", "Mock simulation script ended. Waiting for further input...")
            
        except Exception as e:
            print(f"[Simulation] Error: {e}")

    @staticmethod
    async def _push_transcript(supabase, meeting_id, speaker, content):
        try:
            data = {
                "meeting_id": meeting_id,
                "speaker": speaker,
                "content": content,
                "confidence": 0.99
            }
            supabase.table("meeting_transcripts").insert(data).execute()
        except Exception as e:
            print(f"[Simulation] Failed to push transcript: {e}")

    @staticmethod
    async def _update_cost(supabase, meeting_id, tokens, cost):
        try:
            # We need to upsert or update. Since we created the initial row on creation, we update.
            # However RLS might be tricky if backend is not using service role properly, 
            # but usually get_supabase_client uses standard key. 
            # Assuming row exists from create_meeting.
            supabase.table("meeting_costs").update({
                "llm_tokens": tokens,
                "total_cost": cost,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("meeting_id", meeting_id).execute()
        except Exception as e:
            print(f"[Simulation] Failed to update cost: {e}")
