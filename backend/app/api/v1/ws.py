from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_manager import manager
from app.services.ai.orchestrator import AIOrchestrator
import asyncio

router = APIRouter()

@router.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    await manager.connect(websocket, meeting_id)
    
    # Fetch Meeting & Agent Details
    from app.db.supabase import get_supabase_client
    supabase = get_supabase_client()
    
    try:
        # 1. Get Meeting
        meeting_res = supabase.table("meetings").select("agent_id, mode").eq("id", meeting_id).single().execute()
        if not meeting_res.data:
            await websocket.close(code=4004, reason="Meeting not found")
            return
            
        agent_id = meeting_res.data["agent_id"]
        mode = meeting_res.data.get("mode", "interview")

        # 2. Get Agent
        agent_res = supabase.table("agents").select("voice_model_id").eq("id", agent_id).single().execute()
        if not agent_res.data:
             await websocket.close(code=4004, reason="Agent not found")
             return
             
        # Default fallback voice if missing
        voice_id = agent_res.data.get("voice_model_id") or "21m00Tcm4TlvDq8ikWAM"
        
        orchestrator = AIOrchestrator(meeting_id, agent_id, voice_id, mode=mode)
    except Exception as e:
        print(f"WS Init Error: {e}")
        await websocket.close(code=1011)
        return
    
    # Start Orchestrator Loop Task
    orchestrator_task = asyncio.create_task(orchestrator.run_pipeline())
    
    # Start Audio Sender Task
    async def sender_task():
        try:
            while True:
                chunk = await orchestrator.audio_output_queue.get()
                await websocket.send_bytes(chunk)
        except Exception as e:
            print(f"Sender task error: {e}")

    send_task = asyncio.create_task(sender_task())

    try:
        while True:
            # We expect bytes (Audio) or Text (Control)
            # For this demo, let's assume we receive bytes mostly
            data = await websocket.receive_bytes()
            await orchestrator.ingest_audio(data)
            
    except WebSocketDisconnect:
        orchestrator_task.cancel()
        send_task.cancel()
        manager.disconnect(websocket, meeting_id)

