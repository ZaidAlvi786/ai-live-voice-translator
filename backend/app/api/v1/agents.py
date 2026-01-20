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

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, user: dict = Depends(get_current_user)):
    """
    Synthesize a new Agent Core.
    """
    supabase = get_supabase_client()
    
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
