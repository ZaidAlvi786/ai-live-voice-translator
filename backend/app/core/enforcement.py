from fastapi import HTTPException, Header, Depends
from typing import Optional
from .compliance_service import compliance_service

async def verify_voice_consent(x_agent_id: str = Header(...), x_user_id: str = Header(...)):
    """
    FastAPI Dependency: Block request if Voice Consent is missing.
    Usage: async def generate_audio(..., dependencies=[Depends(verify_voice_consent)])
    """
    has_consent = await compliance_service.verify_consent(x_user_id, x_agent_id)
    if not has_consent:
        # Log the violation
        await compliance_service.log_security_event(
            x_user_id, 
            "ACCESS_DENIED_NO_CONSENT", 
            x_agent_id, 
            {"endpoint": "tts_generation"}
        )
        raise HTTPException(
            status_code=403, 
            detail="Voice Cloning Consent is Missing or Revoked. Please enable consent in Settings."
        )
    return True
