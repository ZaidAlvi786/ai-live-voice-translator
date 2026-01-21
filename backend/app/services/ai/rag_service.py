import os
import requests
from typing import List, Dict, Any
from app.db.supabase import get_supabase_client

class RAGService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not found. RAG will not work.")

    def _get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using OpenAI API directly to avoid extra dependencies if possible,
        or use the openai library if available. Assuming simple requests for minimal deps.
        """
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "input": text,
            "model": "text-embedding-3-small"
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()["data"][0]["embedding"]
        except Exception as e:
            print(f"Embedding generation failed: {e}")
            raise e

    async def ingest_document(self, agent_id: str, user_id: str, filename: str, text: str):
        """
        Chunk text, embed, and store in DB.
        """
        supabase = get_supabase_client()
        
        # Simple chunking for MVP (e.g., by paragraphs or fixed size)
        # Real-world: use langchain RecursiveCharacterTextSplitter
        chunks = [text[i:i+1000] for i in range(0, len(text), 1000)]
        
        for i, chunk in enumerate(chunks):
            if not chunk.strip(): 
                continue
                
            embedding = self._get_embedding(chunk)
            
            doc_data = {
                "agent_id": agent_id,
                "user_id": user_id,
                "filename": filename,
                "content": chunk,
                "embedding": embedding,
                "metadata": {"chunk_index": i}
            }
            
            try:
                supabase.table("documents").insert(doc_data).execute()
            except Exception as e:
                print(f"Failed to insert document chunk: {e}")
                # Continue or raise?
                pass

    async def query_knowledge(self, agent_id: str, query: str, limit: int = 3) -> str:
        """
        Search for relevant context.
        """
        embedding = self._get_embedding(query)
        supabase = get_supabase_client()
        
        # Call Supabase RPC function for similarity search
        # We need to create this RPC function in SQL first! 
        # For now, let's assume we can exact match or filter, 
        # BUT pgvector requires an RPC or specific SQL query. 
        # Supabase-py doesn't support vector search natively without RPC easily.
        
        # Fallback Plan for MVP without custom RPC migration right now:
        # We can't do vector search purely from client without RPC `match_documents`.
        # I will document that we need the RPC function.
        
        try:
             params = {
                "query_embedding": embedding,
                "match_threshold": 0.5,
                "match_count": limit,
                "filter_agent_id": agent_id
             }
             # Assuming 'match_documents' RPC exists
             response = supabase.rpc("match_documents", params).execute()
             
             if response.data:
                 return "\n".join([item["content"] for item in response.data])
             return ""
        except Exception as e:
            print(f"Vector search failed: {e}")
            return ""

# We need the SQL for match_documents RPC. I will add it to the schema file.
