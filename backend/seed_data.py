import os
import asyncio
from dotenv import load_dotenv
from app.db.supabase import get_supabase_client

# Load environment variables
load_dotenv()

async def seed_database():
    supabase = get_supabase_client()
    
    print("--- NEURALIS SEED SCRIPT ---")
    
    # 1. Fetch a valid User ID
    print("Fetching valid user from Supabase...")
    try:
        # We use the admin API to list users and pick the first one
        users_res = supabase.auth.admin.list_users()
        if not users_res:
            raise Exception("No users found in Supabase. Please create a user first.")
        
        user_id = users_res[0].id
        user_email = users_res[0].email
        print(f"Using User: {user_email} ({user_id})")
    except Exception as e:
        print(f"failed to fetch users via admin API: {e}")
        # Fallback to a common dummy or prompt the user if needed
        # But based on our check, we know a user exists.
        raise e
    
    try:
        # 2. Create a Test Agent
        print("Creating Test Agent...")
        agent_data = {
            "user_id": user_id,
            "name": "Neuralis Test Agent",
            "role": "Meeting Assistant",
            "voice_model_id": "21m00Tcm4TlvDq8ikWAM", # ElevenLabs default
            "communication_style": "helpful",
            "personality_config": {"confidence": 0.8, "empathy": 0.7, "technical": 0.6}
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
