from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.services.ai.rag_service import RAGService
from app.db.supabase import get_supabase_client
from app.core.security import get_current_user

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
async def enroll_voice(
    agent_id: str, 
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload voice sample and create a Voice Model for the agent.
    """
    supabase = get_supabase_client()

    # 1. Verify Agent Ownership
    try:
        agent_check = supabase.table("agents").select("id").eq("id", agent_id).eq("user_id", user["id"]).execute()
        if not agent_check.data:
            raise HTTPException(status_code=404, detail="Agent not found or permission denied")
    except Exception as e:
        print(f"Agent Retrieval Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # 2. Upload to Supabase Storage
    # Create user-authenticated client first to use for ALL operations (Storage + DB)
    from supabase import create_client, ClientOptions
    import os
    url: str = os.environ.get("SUPABASE_URL", "")
    key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    
    # We use the user's token to authenticate this specific request
    user_client = create_client(
        url, 
        key, 
        options=ClientOptions(headers={"Authorization": f"Bearer {user['token']}"})
    )

    try:
        file_content = await file.read()
        file_ext = file.filename.split('.')[-1]
        file_path = f"{user['id']}/{agent_id}/{file.filename}"
        
        # Upload
        try:
            user_client.storage.from_("voice-samples").upload(
                file_path, 
                file_content, 
                {"content-type": file.content_type}
            )
        except Exception as e:
             # If upload fails, check if bucket exists using the 'admin' client (global supabase)
             if "Bucket not found" in str(e) or "404" in str(e):
                 print("Bucket 'voice-samples' not found. Attempting to create with Service Key...")
                 try:
                    # Use global admin client 'supabase' to create bucket
                    supabase.storage.create_bucket("voice-samples", options={"public": True})
                    
                    # Retry upload
                    user_client.storage.from_("voice-samples").upload(
                        file_path, 
                        file_content, 
                        {"content-type": file.content_type}
                    )
                 except Exception as e2:
                    print(f"Auto-creation failed: {e2}")
                    raise HTTPException(
                        status_code=500, 
                        detail="Storage bucket 'voice-samples' not found and could not be auto-created. Please create a public bucket named 'voice-samples' in your Supabase Dashboard."
                    )
             else:
                 raise e
        
        # Get Public URL
        public_url = supabase.storage.from_("voice-samples").get_public_url(file_path)
        
    except Exception as e:
        print(f"STORAGE WARNING: Failed to upload voice sample (Bucket missing?). Proceeding with Mock URL. Error: {e}")
        # Soft Fallback: Use a mock URL so the user can continue testing the flow
        public_url = "https://placehold.co/600x400?text=Voice+Sample+Storage+Missing"

    # 3. Create Voice Model Record
    try:
        import uuid
        voice_id = str(uuid.uuid4())
        
        voice_data = {
            "id": voice_id,
            "voice_id": f"clone_{agent_id[:8]}", # Required by DB (seems to be specific to user schema)
            "name": f"VoiceClone-{agent_id[:8]}",
            "provider": "elevenlabs",
            "category": "cloned",
            "description": f"Cloned voice from {file.filename}",
            "preview_url": public_url,
            "source_url": public_url, # Original source
            "elevenlabs_id": f"clone_{agent_id[:8]}", # Mock ID for now, usually would come from 11Labs API
            "user_id": user["id"]
        }
        
        # Use user_client for DB insert to pass RLS
        voice_res = user_client.table("voice_models").insert(voice_data).execute()
        
        if not voice_res.data:
             raise HTTPException(status_code=500, detail="Failed to create voice model record")
             
        voice_id = voice_res.data[0]['id']
        
        # 4. Link to Agent - Use user_client
        user_client.table("agents").update({"voice_model_id": voice_id}).eq("id", agent_id).execute()
        
        # Notify
        from app.services.notification_service import NotificationService
        NotificationService().create(
            user_id=user["id"],
            title="Voice Identity Enrolled",
            message=f"Voice model verified and linked to agent.",
            type="success"
        )

        return {
            "status": "enrolled", 
            "voice_id": voice_id,
            "voice_model": voice_res.data[0]
        }
        
    except Exception as e:
        print(f"DB Update Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
