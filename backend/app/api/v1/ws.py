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
    
    try:
        while True:
            # We expect bytes (Audio) or Text (Control)
            # For this demo, let's assume we receive bytes mostly
            data = await websocket.receive_bytes()
            await orchestrator.ingest_audio(data)
            
            # NOTE: To send audio back to client, we need a mechanism.
            # In `orchestrator.py`, we should have `process_turn` potentially put audio chunks 
            # into a queue that *this* loop or a parallel task consumes.
            # For the scaffold, we will implement a simple queue consumer here.
            
    except WebSocketDisconnect:
        orchestrator_task.cancel()
        manager.disconnect(websocket, meeting_id)

