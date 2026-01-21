from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase import get_supabase_client

router = APIRouter()

class ConnectRequest(BaseModel):
    neural_id: str
    passcode: str
    full_name: str | None = None

class ConnectResponse(BaseModel):
    status: str
    user_id: str
    token: str
    message: str

@router.post("/connect", response_model=ConnectResponse)
async def connect_user(auth_data: ConnectRequest):
    """
    Establish a secure link via Supabase Auth.
    Attempts to Sign In; if the user does not exist, it auto-registers (Sign Up).
    """
    supabase = get_supabase_client()
    
    # Construct a synthetic email for the neural ID
    # If the user provided an email, use it. Otherwise, append default domain.
    raw_id = auth_data.neural_id.strip().lower()
    if "@" in raw_id:
        email = raw_id
    else:
        email = f"{raw_id}@neuralis.ai"
    
    password = auth_data.passcode

    # 1. Attempt Sign In
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception as e:
        # If Sign In fails, return 401 immediately.
        # Do NOT auto-signup, as this hides "Wrong Password" errors and causes rate limits.
        print(f"Login failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not auth_response.user or not auth_response.session:
         raise HTTPException(status_code=401, detail="Authentication failed: No session returned")

    return {
        "status": "connected",
        "user_id": auth_response.user.id,
        "token": auth_response.session.access_token,
        "message": "Biometric synchronization complete. Access granted."
    }




@router.post("/register", response_model=ConnectResponse)
async def register_user(auth_data: ConnectRequest):
    """
    Explicit Registration Endpoint.
    Attempts to Sign Up a new user.
    """
    supabase = get_supabase_client()
    
    raw_id = auth_data.neural_id.strip().lower()
    if "@" in raw_id:
        email = raw_id
    else:
        email = f"{raw_id}@neuralis.ai"
    
    password = auth_data.passcode

    try:
        # Attempt Sign Up
        # Try admin create first to bypass email verify (needs service key)
        # Fallback to public signup if admin fails (e.g. anon key)
        
        try:
             if not hasattr(supabase.auth, 'admin'):
                  raise Exception("Admin API unavailable")

             user_attributes = {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": auth_data.full_name if auth_data.full_name else f"Operative {auth_data.neural_id}",
                    "neural_id": auth_data.neural_id
                }
             }
             supabase.auth.admin.create_user(user_attributes)
             
             # Immediately sign in after creation
             auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
             })
             
        except Exception as create_error:
             print(f"Admin creation failed (falling back to public signup): {create_error}")
             if "already registered" in str(create_error) or "already exists" in str(create_error):
                   raise HTTPException(status_code=400, detail="User already exists")

             # Fallback to normal signup
             auth_response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": auth_data.full_name if auth_data.full_name else f"Operative {auth_data.neural_id}",
                        "neural_id": auth_data.neural_id
                    }
                }
             })

        if not auth_response.user:
             raise HTTPException(status_code=400, detail="Registration failed")
            
        # For public signup, session might be missing if email confirm is needed
        if not auth_response.session:
             return {
                "status": "pending_verification",
                "user_id": auth_response.user.id,
                "token": "", # No token yet
                "message": "Registration successful. Please verify your email."
             }

        return {
            "status": "connected",
            "user_id": auth_response.user.id,
            "token": auth_response.session.access_token,
            "message": "Biometric synchronization complete. Access granted."
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Register Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
