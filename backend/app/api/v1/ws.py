from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_manager import manager
from app.services.ai.orchestrator import AIOrchestrator
import asyncio

router = APIRouter()

@router.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    await manager.connect(websocket, meeting_id)
    
    # Initialize Orchestrator
    # In real app, fetch agent_id and voice_id from DB based on meeting_id
    agent_id = "agent-123" 
    voice_id = "21m00Tcm4TlvDq8ikWAM"
    orchestrator = AIOrchestrator(meeting_id, agent_id, voice_id)
    
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

