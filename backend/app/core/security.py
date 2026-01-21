from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os
from app.db.supabase import get_supabase_service_client

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates Supabase JWT token.
    In a real scenario, this would verify the signature against the SUPABASE_JWT_SECRET.
    For this scaffold, it decodes and extracts the user ID.
    """
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Real Verification with Supabase
    try:
        supabase = get_supabase_service_client()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise ValueError("No user found")
            
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "role": user_response.user.role
        }
        
    except Exception as e:
        print(f"Token Validation Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

class User:
    def __init__(self, id: str):
        self.id = id
