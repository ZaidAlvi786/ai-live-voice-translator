from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from app.core.security import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()

class UserSettings(BaseModel):
    theme: str = "dark"
    notifications_enabled: bool = True
    api_keys: Dict[str, str] = {}

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    api_keys: Optional[Dict[str, str]] = None

@router.get("/settings", response_model=UserSettings)
async def get_settings(user: dict = Depends(get_current_user)):
    """
    Get user settings. Creates default if not exists.
    """
    supabase = get_supabase_client()
    try:
        # Try fetch
        response = supabase.table("user_settings").select("*").eq("user_id", user["id"]).single().execute()
        
        # If not found, create default (Supabase might raise error or return None depending on client version/setup, 
        # but single() usually raises)
        # However, let's catch generic exception or check data
        if response.data:
            return response.data
            
    except Exception:
        # Likely row missing, create default
        try:
            new_settings = {"user_id": user["id"]}
            response = supabase.table("user_settings").insert(new_settings).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Failed to create settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to initialize settings")

    return UserSettings() # Fallback

@router.patch("/settings", response_model=UserSettings)
async def update_settings(update: SettingsUpdate, user: dict = Depends(get_current_user)):
    """
    Update user settings.
    """
    supabase = get_supabase_client()
    
    # 1. Fetch current to merge JSON keys safely if needed? 
    # For now, we overwrite keys if provided.
    
    update_data = {}
    if update.theme is not None:
        update_data["theme"] = update.theme
    if update.notifications_enabled is not None:
        update_data["notifications_enabled"] = update.notifications_enabled
    if update.api_keys is not None:
        update_data["api_keys"] = update.api_keys # Note: This replaces whole object! ideally merge. 
        # For MVP we can assume frontend sends whole object or we merge here.
        # Let's simple replace first. 

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = "now()"

    try:
        # Upsert=True might be easier but we know ID exists usually.
        # But if it doesn't exist yet, we should probably upsert
        update_data["user_id"] = user["id"]
        response = supabase.table("user_settings").upsert(update_data).execute()
        
        if not response.data:
             raise HTTPException(status_code=500, detail="Update failed")
             
        return response.data[0]

    except Exception as e:
        print(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
