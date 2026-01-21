from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@router.put("/me", response_model=dict)
async def update_user(user_data: UserUpdate):
    """
    Simulate updating user profile.
    """
    # In a real app, you would:
    # 1. Get current user from dependency
    # 2. Update fields in DB
    
    return {
        "status": "success",
        "message": "Profile updated successfully",
        "data": user_data.dict(exclude_unset=True)
    }

@router.put("/me/password", response_model=dict)
async def update_password(password_data: PasswordUpdate):
    """
    Simulate updating user password.
    """
    # In a real app, you would:
    # 1. Verify current_password
    # 2. Hash new_password and save
    
    if password_data.current_password == "wrong":
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    return {
        "status": "success",
        "message": "Password updated successfully"
    }
