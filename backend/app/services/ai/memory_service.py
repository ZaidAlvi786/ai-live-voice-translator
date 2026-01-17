from typing import List, Dict
from app.db.supabase import get_supabase_client
# In production, use langchain.memory or similar. 
# For scaffold, a simple class is sufficient and cleaner.

class MemoryService:
    def __init__(self, agent_id: str, session_id: str):
        self.agent_id = agent_id
        self.session_id = session_id
        self.working_memory: List[Dict[str, str]] = [] # Sliding window of last 10 turns
        self.window_size = 10

    async def add_interaction(self, role: str, content: str):
        """Add a turn to working memory."""
        self.working_memory.append({"role": role, "content": content})
        if len(self.working_memory) > self.window_size:
            self.working_memory.pop(0)
            
        # Asynchronously persist to DB if needed
    
    async def get_context(self, current_query: str) -> str:
        """
        Retrieves relevant context from:
        1. Working Memory (Recent chat)
        2. Semantic Memory (Vector Search)
        """
        
        # 1. Format Working Memory
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in self.working_memory])
        
        # 2. Semantic Search (Mocked for now)
        # supabase = get_supabase_client()
        # embedding = await openai_embed(current_query)
        # results = supabase.rpc('match_documents', {query_embedding: embedding}).execute()
        relevant_facts = "Fact: User is a Senior React Engineer.\nFact: User is applying for a Tech Lead role." 
        
        return f"RELEVANT FACTS:\n{relevant_facts}\n\nCONVERSATION HISTORY:\n{history_str}"
    
    def get_history_for_llm(self) -> List[Dict[str, str]]:
        return self.working_memory
