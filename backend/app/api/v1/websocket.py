from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.realtime.manager import manager
from app.services.audio.pipeline import pipeline_orchestrator
import asyncio

router = APIRouter()

@router.websocket("/ws/audio-ingest")
async def audio_ingest(websocket: WebSocket, source_lang: str = "en", target_lang: str = "ur"):
    await websocket.accept()
    print(f"Audio Ingest WebSocket Connected. Source: {source_lang}, Target: {target_lang}")
    try:
        # Create an async generator for the pipeline to consume
        queue = asyncio.Queue()
        
        async def audio_generator():
            while True:
                chunk = await queue.get()
                if chunk is None: break
                yield chunk

        # Start the pipeline task
        pipeline_task = asyncio.create_task(
            pipeline_orchestrator.process_pipeline(
                audio_generator(), 
                source_lang=source_lang, 
                target_lang=target_lang, 
                output_ws=websocket
            )
        )

        while True:
            # Receive Audio Bytes from Extension
            data = await websocket.receive_bytes()
            await queue.put(data)
            
    except WebSocketDisconnect:
        print("Audio Ingest Disconnected")
        await queue.put(None) # Signal generator to stop
        # pipeline_task.cancel() # Optional: ensure task cleanup
    except Exception as e:
        print(f"Audio Ingest Error: {e}")

@router.websocket("/ws/interview/{interview_id}")
async def interview_signaling(websocket: WebSocket, interview_id: str):
    await manager.connect(websocket, interview_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Simple signaling relay:
            # If Client A sends 'offer', we broadcast it to others in the room (Client B)
            # In a real app, we might inspect 'target' or 'type' to be more selective.
            
            # Add sender info or validation here if needed
            await manager.broadcast(data, interview_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, interview_id)
        await manager.broadcast({"type": "peer-left"}, interview_id)
