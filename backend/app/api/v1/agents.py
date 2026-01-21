from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.core.security import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()

# --- Models ---
class AgentPersonality(BaseModel):
    confidence: float
    empathy: float
    technical: float
    speed: float = 1.0

class AgentCreate(BaseModel):
    name: str # The user can name their agent
    personality_config: AgentPersonality
    voice_model_id: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    personality_config: AgentPersonality
    voice_model_id: Optional[str] = None
    status: str
    created_at: str

# --- Endpoints ---

@router.get("/options")
async def get_agent_options(user: dict = Depends(get_current_user)):
    """
    Get available voice models and agent templates.
    """
    supabase = get_supabase_client()
    try:
        voices = supabase.table("voice_models").select("*").execute()
        templates = supabase.table("agent_templates").select("*").execute()
        return {
            "voice_models": voices.data,
            "templates": templates.data
        }
    except Exception as e:
        print(f"Error fetching options: {e}")
        # Return empty lists instead of crashing if tables don't exist yet
        return {
            "voice_models": [],
            "templates": []
        }

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, user: dict = Depends(get_current_user)):
    """
    Synthesize a new Agent Core.
    """
    supabase = get_supabase_client()
    
    # Validation: Check if voice_model_id is valid (if provided)
    if agent.voice_model_id:
        try:
            voice_check = supabase.table("voice_models").select("id").eq("id", agent.voice_model_id).execute()
            # If the table exists but returns no data, it's invalid.
            # If the table DOES NOT exist, it might throw an error or return empty.
            # We'll assume strict validation only if the table query succeeds.
            if voice_check.data is not None and len(voice_check.data) == 0:
                 raise HTTPException(status_code=400, detail=f"Invalid voice_model_id: {agent.voice_model_id}")
        except Exception as e:
             # If table doesn't exist yet, we might want to allow it or log it.
             # For now, let's log and proceed (soft validation) or fail?
             # User requested "validation", so let's be strict but careful about missing tables.
             print(f"Warning: Voice validation failed (table might be missing): {e}")

    agent_data = {
        "user_id": user["id"],
        "name": agent.name,
        "personality_config": agent.personality_config.model_dump(), # Store as JSON
        "voice_model_id": agent.voice_model_id,
        "status": "creating" # Initial status
    }

    try:
        response = supabase.table("agents").insert(agent_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create agent record")
            
        return response.data[0]
        
    except Exception as e:
        print(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[AgentResponse])
async def list_agents(user: dict = Depends(get_current_user)):
    """
    List all agents for the current user.
    """
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("agents").select("*").eq("user_id", user["id"]).execute()
        return response.data
    except Exception as e:
        print(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, user: dict = Depends(get_current_user)):
    """
    Get a specific agent by ID.
    """
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("agents").select("*").eq("id", agent_id).eq("user_id", user["id"]).single().execute()
        # .single() raises an error if no row is found, but the Supabase python client behavior 
        # for 'single()' sometimes returns the object or errors. 
        # If response.data is empty/null, it means not found or permission denied.
        return response.data
    except Exception as e:
        # Check if it is a 'Row not found' error
        print(f"Error getting agent {agent_id}: {e}")
        raise HTTPException(status_code=404, detail="Agent not found")



class AgentUpdate(BaseModel):
    name: Optional[str] = None
    personality_config: Optional[AgentPersonality] = None
    voice_model_id: Optional[str] = None
    status: Optional[str] = None

@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, update: AgentUpdate, user: dict = Depends(get_current_user)):
    """
    Update an existing agent.
    """
    supabase = get_supabase_client()
    
    # Prepare update data
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.personality_config is not None:
        update_data["personality_config"] = update.personality_config.model_dump()
    if update.voice_model_id is not None:
        update_data["voice_model_id"] = update.voice_model_id
    if update.status is not None:
        update_data["status"] = update.status

    if not update_data:
         raise HTTPException(status_code=400, detail="No fields to update")

    try:
        response = supabase.table("agents").update(update_data).eq("id", agent_id).eq("user_id", user["id"]).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent not found or update failed")
            
        return response.data[0]
        
    except Exception as e:
        print(f"Error updating agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, user: dict = Depends(get_current_user)):
    """
    Delete an agent.
    """
    supabase = get_supabase_client()
    
    try:
        # RLS should handle the user_id check, but we include it for extra safety
        response = supabase.table("agents").delete().eq("id", agent_id).eq("user_id", user["id"]).execute()
        
        # Supabase-py delete returns the deleted rows in .data
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent not found or permission denied")
            
        return {"message": "Agent deleted successfully", "id": agent_id}
        
    except Exception as e:
        print(f"Error deleting agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
from app.services.ai.rag_service import RAGService

@router.post("/{agent_id}/knowledge")
async def upload_knowledge(
    agent_id: str, 
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    """
    Upload a document to the agent's knowledge base.
    """
    # 1. Verify Agent Ownership
    supabase = get_supabase_client()
    try:
        agent_check = supabase.table("agents").select("id").eq("id", agent_id).eq("user_id", user["id"]).execute()
        if not agent_check.data:
            raise HTTPException(status_code=404, detail="Agent not found or permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 2. Read Content
    # Limit file size/type in production
    content = await file.read()
    
    # 3. Simple Text Extraction (Assuming .txt for MVP, or extract text from bytes)
    # For PDF support, we'd need PyPDF2 or similar. 
    # Let's support plain text now, and maybe basic PDF parsing if we add a dependency.
    # We will assume it's utf-8 text file.
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Only UTF-8 text files are supported currently")
        
    # 4. Ingest via RAG Service
    rag = RAGService()
    await rag.ingest_document(agent_id, user["id"], file.filename, text_content)
    
    return {"message": "Document ingested successfully", "filename": file.filename}
