from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.services.ai.rag_service import RAGService
from app.db.supabase import get_supabase_client

router = APIRouter()

class ModeConfig(BaseModel):
    mode_type: str # 'interview', 'standup'
    system_prompt_override: Optional[str] = None
    config: Optional[dict] = {}

@router.post("/{agent_id}/upload_knowledge")
async def upload_knowledge(
    agent_id: str,
    file: UploadFile = File(...),
    source_type: str = Form("general"), # 'resume', 'project', 'standup'
    allowed_modes: str = Form("[]"), # JSON string list e.g. ["interview"]
    user_id: str = Form(...) # In prod, get from auth context
):
    """
    Ingest a document into the Agent's knowledge base.
    """
    import json
    modes_list = json.loads(allowed_modes)
    
    content = await file.read()
    rag = RAGService(user_id=user_id)
    
    try:
        await rag.ingest_document(
            agent_id=agent_id, 
            user_id=user_id, 
            filename=file.filename, 
            content=content,
            source_type=source_type,
            allowed_modes=modes_list
        )
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/configure_mode")
async def configure_mode(agent_id: str, config: ModeConfig, user_id: str):
    """
    Set up specific behavior for a mode (Interview vs Standup).
    """
    supabase = get_supabase_client()
    
    data = {
        "agent_id": agent_id,
        "mode_type": config.mode_type,
        "system_prompt_override": config.system_prompt_override,
        "config": config.config
    }
    
    # Upsert logic (on conflict agent_id, mode_type)
    try:
        # Supabase 'upsert' works if we have a unique constraint
        supabase.table("agent_modes").upsert(data, on_conflict="agent_id, mode_type").execute()
        return {"status": "updated", "mode": config.mode_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/enroll_voice")
async def enroll_voice(agent_id: str, voice_sample: UploadFile = File(...)):
    """
    Stub for ElevenLabs Voice Cloning enrollment.
    """
    return {"status": "mock_enrolled", "voice_id": "eleven_cloned_123"}
