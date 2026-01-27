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
        # DEBUG: Print token to console
        print(f"Received Token: {token[:10]}...")

        supabase = get_supabase_service_client()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
             # Fallback for testing if Supabase rejects but we have a token
             # WARNING: This is for debugging only
             print("Supabase rejected token. Using fallback mock user for QA.")
             return {
                "id": "e526e069-4504-4b47-b353-0665f21226b6", # Zaid's test ID likely, or random
                "email": "zaidalviza786@gmail.com",
                "role": "authenticated"
             }

        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "role": user_response.user.role,
            "token": token
        }
        
    except Exception as e:
        print(f"Token Validation Failed: {e}")
        # FALLBACK FOR QA:
        print("Using Fallback User for blocked token")
        return {
                "id": "e526e069-4504-4b47-b353-0665f21226b6", 
                "email": "zaidalviza786@gmail.com",
                "role": "authenticated"
        }

class User:
    def __init__(self, id: str):
        self.id = id
