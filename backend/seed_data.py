import os
import asyncio
from dotenv import load_dotenv
from app.db.supabase import get_supabase_client

# Load environment variables
load_dotenv()

async def seed_database():
    supabase = get_supabase_client()
    
    print("--- NEURALIS SEED SCRIPT ---")
    
    # 1. Create a Test User (or use existing if any)
    # Note: We use a random UUID for user_id to bypass auth dependency in local tests
    user_id = "00000000-0000-0000-0000-000000000000"
    
    try:
        # 2. Create a Test Agent
        print("Creating Test Agent...")
        agent_data = {
            "user_id": user_id,
            "name": "Neuralis Test Agent",
            "role": "Meeting Assistant",
            "voice_model_id": "21m00Tcm4TlvDq8ikWAM", # ElevenLabs default
            "communication_style": "helpful"
        }
        agent_res = supabase.table("agents").insert(agent_data).execute()
        agent = agent_res.data[0]
        print(f"Agent Created: {agent['id']} ({agent['name']})")
        
        # 3. Create a Test Meeting
        print("Creating Test Meeting...")
        meeting_data = {
            "user_id": user_id,
            "agent_id": agent["id"],
            "status": "active",
            "platform": "google_meet",
            "external_url": "https://meet.google.com/btk-gfrq-vvk"
        }
        meeting_res = supabase.table("meetings").insert(meeting_data).execute()
        meeting = meeting_res.data[0]
        print(f"Meeting Created: {meeting['id']}")
        
        print("\nSUCCESS! You can now test your WebSocket using the following command:")
        print(f"python3 test_ws.py {meeting['id']}")
        print(f"OR even using the Google Meet code: python3 test_ws.py btk-gfrq-vvk")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nPOSSIBLE CAUSES:")
        print("1. Your SUPABASE_SERVICE_KEY in .env might be an 'anon' key instead of 'service_role'.")
        print("2. Database RLS policies are preventing inserts.")
        print("\nPlease ensure .env has the correct service_role key.")

if __name__ == "__main__":
    asyncio.run(seed_database())
