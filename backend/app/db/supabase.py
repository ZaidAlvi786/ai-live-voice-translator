import os
from supabase import create_client, Client
from functools import lru_cache

@lru_cache()
def get_supabase_service_client() -> Client:
    url: str = os.environ.get("SUPABASE_URL", "")
    key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    
    if not url or not key:
        print("WARNING: Supabase credentials missing (URL/SERVICE_KEY).")
    
    return create_client(url, key)

# Alias for backward compatibility if any
get_supabase_client = get_supabase_service_client
