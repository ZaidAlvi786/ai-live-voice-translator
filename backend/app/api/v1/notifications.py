from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.security import get_current_user
from app.db.supabase import get_supabase_client
from datetime import datetime

router = APIRouter()

class Notification(BaseModel):
    id: str
    title: str
    message: str
    type: str = "info"
    read: bool
    created_at: str

class CreateNotification(BaseModel):
    title: str
    message: str
    type: str = "info"

@router.get("/", response_model=List[Notification])
async def list_notifications(limit: int = 10, user: dict = Depends(get_current_user)):
    """
    Get user notifications, ordered by newest.
    """
    supabase = get_supabase_client()
    try:
        response = supabase.table("notifications")\
            .select("*")\
            .eq("user_id", user["id"])\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return []

@router.post("/", response_model=Notification)
async def create_notification(note: CreateNotification, user: dict = Depends(get_current_user)):
    """
    Internal/Testing endpoint to create a notification.
    """
    supabase = get_supabase_client()
    try:
        data = {
            "user_id": user["id"],
            "title": note.title,
            "message": note.message,
            "type": note.type,
            "read": False
        }
        response = supabase.table("notifications").insert(data).execute()
        return response.data[0]
    except Exception as e:
        print(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")

@router.patch("/{id}/read", response_model=Notification)
async def mark_read(id: str, user: dict = Depends(get_current_user)):
    """
    Mark a notification as read.
    """
    supabase = get_supabase_client()
    try:
        response = supabase.table("notifications")\
            .update({"read": True})\
            .eq("id", id)\
            .eq("user_id", user["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        return response.data[0]
    except Exception as e:
        print(f"Error marking read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification")
