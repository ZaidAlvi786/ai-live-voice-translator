import datetime
from typing import Optional, Dict
from app.db.supabase import get_supabase_service_client

class ComplianceService:
    """
    Enforces Security, Trust, and Legal Compliance.
    """
    
    def __init__(self):
        self.supabase = get_supabase_service_client()

    async def log_security_event(self, user_id: str, event_type: str, resource_id: str = None, metadata: Dict = None, ip_address: str = None):
        """
        Writes an immutable audit log entry.
        """
        data = {
            "user_id": user_id,
            "event_type": event_type,
            "resource_id": resource_id,
            "metadata": metadata or {},
            "ip_address": ip_address,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        try:
            # Using service role to bypass RLS for writing logs
            self.supabase.table("security_events").insert(data).execute()
        except Exception as e:
            print(f"[CRITICAL] FAILED TO WRITE AUDIT LOG: {e}")
            # In high-security mode, this might raise an exception to stop traffic
            
    async def verify_consent(self, user_id: str, agent_id: str) -> bool:
        """
        Checks if a valid, unrevoked consent exists for voice cloning.
        """
        try:
            response = self.supabase.table("voice_consents")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("agent_id", agent_id)\
                .is_("revoked_at", "null")\
                .execute()
                
            if response.data and len(response.data) > 0:
                return True
            return False
        except Exception as e:
            print(f"Consent Verification Error: {e}")
            return False

    async def grant_consent(self, user_id: str, agent_id: str, consent_text: str, proof_path: str, ip: str):
        """
        Records a new consent grant.
        """
        data = {
            "user_id": user_id,
            "agent_id": agent_id,
            "consent_text": consent_text,
            "audio_proof_path": proof_path,
            "ip_address": ip,
            "granted_at": datetime.datetime.utcnow().isoformat()
        }
        self.supabase.table("voice_consents").insert(data).execute()
        await self.log_security_event(user_id, "CONSENT_GRANTED", agent_id, {"type": "voice"}, ip)

    async def revoke_consent(self, user_id: str, agent_id: str):
        """
        Revokes consent immediately.
        """
        now = datetime.datetime.utcnow().isoformat()
        self.supabase.table("voice_consents")\
            .update({"revoked_at": now})\
            .eq("user_id", user_id)\
            .eq("agent_id", agent_id)\
            .execute()
            
        await self.log_security_event(user_id, "CONSENT_REVOKED", agent_id)

    async def export_user_data(self, user_id: str) -> Dict:
        """
        GDPR Right to Access: Exports all known data for a user.
        """
        # Fetch agents
        agents = self.supabase.table("agents").select("*").eq("user_id", user_id).execute().data
        # Fetch audit logs
        logs = self.supabase.table("security_events").select("*").eq("user_id", user_id).execute().data
        
        return {
            "user_id": user_id,
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "agents": agents,
            "security_history": logs
        }

compliance_service = ComplianceService()
