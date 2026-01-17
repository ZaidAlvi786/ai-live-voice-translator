from app.db.supabase import get_supabase_service_client
from typing import Optional

class FinOpsService:
    """
    Real-time Cost Tracking & Budget Enforcement.
    """
    
    # Pricing Rates (Approximate)
    RATES = {
        "gpt-4-1106-preview": {"input": 10/1000000, "output": 30/1000000}, # $10/$30 per 1M tokens
        "eleven_turbo_v2": 0.30 / 1000, # $0.30 per 1000 chars
        "nova-2": 0.0043 / 60 # $0.0043 per minute (Deepgram)
    }
    
    MEETING_CAP_USD = 2.00 # Hard limit per meeting

    def __init__(self):
        self.supabase = get_supabase_service_client()

    async def log_cost(self, session_id: str, resource_type: str, quantity: float, provider: str, user_id: str = None):
        """
        Record a spend event.
        Calculates USD cost based on hardcoded rates (should be DB backed in prod).
        """
        cost_usd = 0.0
        
        if resource_type == "LLM_TOKEN_INPUT":
             cost_usd = quantity * self.RATES["gpt-4-1106-preview"]["input"]
        elif resource_type == "LLM_TOKEN_OUTPUT":
             cost_usd = quantity * self.RATES["gpt-4-1106-preview"]["output"]
        elif resource_type == "TTS_CHAR":
             cost_usd = quantity * self.RATES["eleven_turbo_v2"]
        elif resource_type == "STT_SEC":
             cost_usd = (quantity / 60) * self.RATES["nova-2"] * 60 # wait, rate is per min?
             # Deepgram is ~$0.0043/min. 
             cost_usd = (quantity / 60) * 0.0043
            
        data = {
            "session_id": session_id,
            "user_id": user_id,
            "resource_type": resource_type,
            "quantity": quantity,
            "cost_usd": cost_usd,
            "provider": provider
        }
        
        try:
            self.supabase.table("cost_ledger").insert(data).execute()
        except Exception as e:
            print(f"[FinOps] Failed to log cost: {e}")

    async def check_budget(self, session_id: str) -> bool:
        """
        Returns True if session is WITHIN budget.
        Returns False if budget exceeded.
        """
        try:
            # Aggregate total cost for session
            # Supabase doesn't easily support Agg functions in client without RPC, 
            # so standard practice involves RPC or manual sum (inefficient at scale).
            # For scaffold, using a direct select sum logic via python or assumed view
            
            # Using the View we created
            res = self.supabase.table("session_costs").select("total_cost").eq("session_id", session_id).execute()
            
            if res.data and len(res.data) > 0:
                total = res.data[0]['total_cost'] or 0.0
                if total > self.MEETING_CAP_USD:
                    return False
            return True
        except Exception as e:
            print(f"[FinOps] Budget Check Error: {e}")
            return True # Fail open to avoid disrupting service on db error

finops_service = FinOpsService()
