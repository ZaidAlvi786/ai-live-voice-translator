from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.core.security import get_current_user

router = APIRouter()

# --- Models ---
class AgentCreate(BaseModel):
    name: str
    personality_config: dict
    voice_model_id: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    status: str

# --- Endpoints ---

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, user: dict = Depends(get_current_user)):
    """
    Synthesize a new Agent Core.
    """
    # Mock DB interaction
    new_agent = {
        "id": "agent-uuid-123",
        "user_id": user["id"],
        "name": agent.name,
        "status": "ready",
        "personality_config": agent.personality_config
    }
    return new_agent

@router.get("/", response_model=List[AgentResponse])
async def list_agents(user: dict = Depends(get_current_user)):
    """
    List all agents for the current user.
    """
    return [
        {
            "id": "agent-uuid-123",
            "user_id": user["id"],
            "name": "Athena",
            "status": "active"
        }
    ]

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, user: dict = Depends(get_current_user)):
    return {
        "id": agent_id,
        "user_id": user["id"],
        "name": "Athena",
        "status": "active"
    }
