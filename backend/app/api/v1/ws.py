from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_manager import manager
from app.services.ai.orchestrator import AIOrchestrator
import asyncio

router = APIRouter()

@router.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    print(f"WS Connecting: {meeting_id}")
    await manager.connect(websocket, meeting_id)
    print(f"WS Connected: {meeting_id}")
    
    # Fetch Meeting & Agent Details
    from app.db.supabase import get_supabase_client
    import uuid
    supabase = get_supabase_client()
    
    # --- Local Test Bypass ---
    if meeting_id == "local-test":
        print("WS: Using Local Test Bypass (No DB needed)")
        orchestrator = AIOrchestrator("local-test", "local-agent", "21m00Tcm4TlvDq8ikWAM", mode="interview")
    else:
        try:
            # 1. Get Meeting
            is_uuid = False
            try:
                uuid.UUID(meeting_id)
                is_uuid = True
            except ValueError:
                pass

            meeting_data = None
            if is_uuid:
                # Use execute() instead of single() to handle missing rows gracefully
                meeting_res = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
                if meeting_res.data:
                    meeting_data = meeting_res.data[0]
            else:
                meeting_res = supabase.table("meetings").select("*").filter("external_url", "ilike", f"%{meeting_id}%").execute()
                if meeting_res.data:
                    meeting_data = meeting_res.data[0]

            if not meeting_data:
                await websocket.close(code=4004, reason=f"Meeting {meeting_id} not found. Please run seed_data.py after updating your Service Key.")
                return
                
            agent_id = meeting_data["agent_id"]
            mode = meeting_data.get("mode", "interview")

            # 2. Get Agent
            agent_res = supabase.table("agents").select("voice_model_id").eq("id", agent_id).execute()
            voice_id = "21m00Tcm4TlvDq8ikWAM"
            if agent_res.data:
                 voice_id = agent_res.data[0].get("voice_model_id") or voice_id
                 
            orchestrator = AIOrchestrator(meeting_id, agent_id, voice_id, mode=mode)
            print(f"WS Orchestrator Created for {meeting_id}")
        except Exception as e:
            print(f"WS Init Error: {e}")
            import traceback
            traceback.print_exc()
            error_msg = str(e)
            if "PGRST116" in error_msg or "0 rows" in error_msg:
                reason = "Meeting record missing from database."
            else:
                reason = f"Internal Database Error: {error_msg}"
            await websocket.close(code=1011, reason=reason)
            return
    
    # Wrapper to catch orchestrator errors
    async def run_orchestrator():
        try:
            print(f"WS starting orchestrator task for {meeting_id}")
            await orchestrator.run_pipeline()
        except Exception as e:
            print(f"WS Orchestrator Task Error: {e}")
            import traceback
            traceback.print_exc()

    # Start Orchestrator Loop Task
    orchestrator_task = asyncio.create_task(run_orchestrator())
    
    # Start Audio Sender Task
    async def sender_task():
        try:
            print(f"WS starting sender task for {meeting_id}")
            while True:
                chunk = await orchestrator.audio_output_queue.get()
                # print(f"WS sending {len(chunk)} bytes to client")
                await websocket.send_bytes(chunk)
        except Exception as e:
            print(f"WS Sender Task Error: {e}")
            import traceback
            traceback.print_exc()

    send_task = asyncio.create_task(sender_task())

    try:
        while True:
            # We expect bytes (Audio) or Text (Control)
            # For this demo, let's assume we receive bytes mostly
            data = await websocket.receive_bytes()
            # print(f"WS received {len(data)} bytes from client")
            await orchestrator.ingest_audio(data)
            
    except WebSocketDisconnect:
        print(f"WS Client Disconnected: {meeting_id}")
        orchestrator_task.cancel()
        send_task.cancel()
        manager.disconnect(websocket, meeting_id)
    except Exception as e:
        print(f"WS Main Loop Error: {e}")
        orchestrator_task.cancel()
        send_task.cancel()
        manager.disconnect(websocket, meeting_id)

