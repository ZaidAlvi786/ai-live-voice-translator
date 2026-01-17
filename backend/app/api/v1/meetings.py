from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.core.security import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()

# --- Models ---
class MeetingCreate(BaseModel):
    agent_id: str
    meeting_type: str # 'interview', 'standup', 'general'

class TelemetryPoint(BaseModel):
    agent_id: str
    metric: str
    value: float
    timestamp: Optional[datetime] = None

# --- Endpoints ---

@router.post("/start")
async def start_meeting(data: MeetingCreate, user: dict = Depends(get_current_user)):
    """
    Initialize a new tactical mission (meeting).
    """
    supabase = get_supabase_client()
    
    # response = supabase.table("meetings").insert({
    #     "agent_id": data.agent_id,
    #     "meeting_type": data.meeting_type,
    #     "started_at": "now()"
    # }).execute()
    
    return {
        "id": "meeting-uuid-789",
        "agent_id": data.agent_id,
        "status": "active",
        "started_at": datetime.now()
    }

@router.post("/telemetry")
async def log_telemetry(points: List[TelemetryPoint], user: dict = Depends(get_current_user)):
    """
    Batch log telemetry data from the frontend or agent core.
    """
    # In production, use high-throughput logging or time-series DB
    print(f"Received {len(points)} telemetry points")
    
    return {"status": "logged", "count": len(points)}
