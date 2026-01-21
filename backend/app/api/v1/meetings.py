from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.core.security import get_current_user
from app.db.supabase import get_supabase_client
from datetime import datetime

router = APIRouter()

# --- Models ---
class MeetingCreate(BaseModel):
    agent_id: str

class MeetingUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    recording_url: Optional[str] = None
    ended_at: Optional[datetime] = None

class MeetingResponse(BaseModel):
    id: str
    agent_id: str
    user_id: str
    started_at: str
    ended_at: Optional[str] = None
    summary: Optional[str] = None
    recording_url: Optional[str] = None
    status: str
    created_at: str
    # Enriched fields
    total_cost: Optional[float] = 0.0
    duration_seconds: Optional[int] = 0

# --- Endpoints ---

@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(agent_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """
    List meetings. Check 'agent_id' query param to filter by agent.
    """
    supabase = get_supabase_client()
    try:
        # Select meetings with their cost data
        # Note: referencing the foreign key table 'meeting_costs'
        query = supabase.table("meetings").select("*, meeting_costs(total_cost)").eq("user_id", user["id"])
        
        if agent_id:
            query = query.eq("agent_id", agent_id)
            
        # Order by newest first
        response = query.order("started_at", desc=True).execute()
        
        # Transform data to flatten structure if needed, or rely on Pydantic alias if names matched.
        # Supabase returns meeting_costs as a list or object. 
        # Typically: { ..., meeting_costs: [{ total_cost: 1.23 }] } or null
        
        cleaned_data = []
        for m in response.data:
            cost_info = m.get("meeting_costs")
            total_cost = 0.0
            if cost_info and isinstance(cost_info, list) and len(cost_info) > 0:
                total_cost = cost_info[0].get("total_cost", 0.0)
            elif cost_info and isinstance(cost_info, dict):
                 total_cost = cost_info.get("total_cost", 0.0)
            
            # Calculate duration if ended
            duration = 0
            if m.get("ended_at") and m.get("started_at"):
                try:
                    start = datetime.fromisoformat(m["started_at"].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(m["ended_at"].replace('Z', '+00:00'))
                    duration = int((end - start).total_seconds())
                except:
                    pass

            m["total_cost"] = total_cost
            m["duration_seconds"] = duration
            cleaned_data.append(m)

        return cleaned_data
    except Exception as e:
        print(f"Error listing meetings: {e}")
        # Return empty list on error to prevent UI crash
        return []

@router.post("/", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate, user: dict = Depends(get_current_user)):
    """
    Start a new meeting session.
    """
    supabase = get_supabase_client()
    
    # 1. Verify agent ownership
    try:
        agent_check = supabase.table("agents").select("id").eq("id", meeting.agent_id).eq("user_id", user["id"]).single().execute()
        if not agent_check.data:
             raise HTTPException(status_code=404, detail="Agent not found")
    except Exception as e:
         print(f"Agent verification failed: {e}")
         raise HTTPException(status_code=404, detail="Agent not found or access denied")

    # 2. Create meeting
    meeting_data = {
        "user_id": user["id"],
        "agent_id": meeting.agent_id,
        "status": "active",
        # started_at defaults to now() in DB
    }

    try:
    try:
        response = supabase.table("meetings").insert(meeting_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create meeting")
        
        new_meeting = response.data[0]
        
        # 3. Initialize Cost Record
        try:
             supabase.table("meeting_costs").insert({
                 "meeting_id": new_meeting["id"],
                 "total_cost": 0.0,
                 "llm_tokens": 0
             }).execute()
        except Exception as cost_err:
            print(f"Warning: Failed to init meeting costs: {cost_err}")

        # Return with defaults
        new_meeting["total_cost"] = 0.0
        new_meeting["duration_seconds"] = 0
        
        return new_meeting
    except Exception as e:
        print(f"Error creating meeting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(meeting_id: str, update: MeetingUpdate, user: dict = Depends(get_current_user)):
    """
    Update a meeting (e.g. end it, add summary).
    """
    supabase = get_supabase_client()
    
    update_data = {}
    if update.status:
        update_data["status"] = update.status
    if update.summary:
        update_data["summary"] = update.summary
    if update.recording_url:
        update_data["recording_url"] = update.recording_url
    if update.ended_at:
        update_data["ended_at"] = update.ended_at.isoformat()
    # If finishing, automatically set ended_at if not provided? 
    # Let's rely on client providing it or just set it if status becomes completed.
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
    try:
        response = supabase.table("meetings").update(update_data).eq("id", meeting_id).eq("user_id", user["id"]).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        updated_meeting = response.data[0]
        
        # Fetch latest cost for response
        cost_res = supabase.table("meeting_costs").select("total_cost").eq("meeting_id", meeting_id).execute()
        total_cost = 0.0
        if cost_res.data:
            total_cost = cost_res.data[0].get("total_cost", 0.0)
            
        updated_meeting["total_cost"] = total_cost
        
        # Calc duration
        duration = 0
        if updated_meeting.get("ended_at") and updated_meeting.get("started_at"):
             try:
                start = datetime.fromisoformat(updated_meeting["started_at"].replace('Z', '+00:00'))
                end = datetime.fromisoformat(updated_meeting["ended_at"].replace('Z', '+00:00'))
                duration = int((end - start).total_seconds())
             except:
                pass
        updated_meeting["duration_seconds"] = duration

        return updated_meeting
    except Exception as e:
        print(f"Error updating meeting: {e}")
        raise HTTPException(status_code=500, detail=str(e))
