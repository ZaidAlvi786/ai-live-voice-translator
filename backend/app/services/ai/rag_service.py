import os
import requests
from typing import List, Dict, Any
from app.db.supabase import get_supabase_client

class RAGService:
    def __init__(self, user_id: str = None):
        self.user_id = user_id
        self.openai_api_key = os.getenv("OPENAI_API_KEY") # Default fallback
        
        if self.user_id:
            self._load_user_keys()

    def _load_user_keys(self):
        try:
             supabase = get_supabase_client()
             settings = supabase.table("user_settings").select("api_keys").eq("user_id", self.user_id).single().execute()
             if settings.data and settings.data.get("api_keys"):
                 user_keys = settings.data["api_keys"]
                 if user_keys.get("openai"):
                     self.openai_api_key = user_keys["openai"]
        except Exception as e:
            print(f"Failed to load user keys: {e}")

    def _get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using OpenAI API.
        """
        if not self.openai_api_key:
             print("Error: No OpenAI API Key found (Env or Settings)")
             raise ValueError("OpenAI API Key is required")

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

    async def ingest_document(self, agent_id: str, user_id: str, filename: str, content: Any, source_type: str = "general", allowed_modes: List[str] = None):
        """
        Chunk text, embed, and store in DB with strict scoping.
        Active content can be str (text) or bytes (file).
        """
        supabase = get_supabase_client()
        
        text_content = ""
        
        # 1. Extract Text based on type
        if filename.lower().endswith('.pdf'):
            try:
                import io
                from pypdf import PdfReader
                if isinstance(content, str):
                    # Should be bytes for PDF, but if passed as string (unlikely for file upload flow?), handle error
                    raise ValueError("PDF content must be bytes")
                
                pdf_file = io.BytesIO(content)
                reader = PdfReader(pdf_file)
                text_content = ""
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
            except Exception as e:
                print(f"PDF extraction failed: {e}")
                # Fallback or re-raise
                raise e
        elif isinstance(content, bytes):
             # Assume text file
            try:
                text_content = content.decode("utf-8")
            except:
                # If decode fails, maybe ignore or try latin-1
                print("Failed to decode text file, skipping.")
                return 
        else:
             text_content = content # Assume str

        # 2. Chunking
        # Simple chunking for MVP (e.g., by paragraphs or fixed size)
        chunks = [text_content[i:i+1000] for i in range(0, len(text_content), 1000)]
        
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
                "metadata": {"chunk_index": i},
                "source_type": source_type,
                "allowed_modes": allowed_modes or []
            }
            
            try:
                supabase.table("documents").insert(doc_data).execute()
            except Exception as e:
                print(f"Failed to insert document chunk: {e}")
                pass

    async def delete_document(self, agent_id: str, filename: str):
        """
        Delete all chunks for a given file.
        """
        supabase = get_supabase_client()
        try:
            # Delete where agent_id AND filename match
            supabase.table("documents").delete().eq("agent_id", agent_id).eq("filename", filename).execute()
        except Exception as e:
            print(f"Failed to delete document {filename}: {e}")
            raise e

    async def ingest_text(self, agent_id: str, user_id: str, title: str, text: str):
        """
        Ingest raw text.
        """
        await self.ingest_document(agent_id, user_id, title, text)

    async def ingest_url(self, agent_id: str, user_id: str, url: str):
        """
        Scrape URL and ingest.
        """
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            # Naive HTML text extraction. 
            # In production, use BeautifulSoup or specialized scraper.
            # Using simple regex to strip tags for MVP.
            import re
            text = re.sub('<[^<]+?>', '', resp.text)
            title = url
            # Try to find title tag
            title_match = re.search('<title>(.*?)</title>', resp.text, re.IGNORECASE)
            if title_match:
                title = title_match.group(1)
            
            await self.ingest_document(agent_id, user_id, f"WEB: {title}", text)
        except Exception as e:
            print(f"Failed to scrape URL {url}: {e}")
            raise e

    async def list_documents(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        List all ingested documents for an agent (grouped by filename).
        """
        supabase = get_supabase_client()
        try:
            # We want unique filenames or sources.
            # Since we store chunks, we need to group.
            # Supabase JS has .csv() etc, but here let's select distinct filename.
            # SQL: SELECT DISTINCT filename FROM documents WHERE agent_id = ...
            # Supabase-py doesn't support .distinct() easily on select('*').
            # We will select filename, created_at, metadata.
            
            # NOTE: This query might return duplicates if we don't handle it.
            # For MVP, fetching all and deduping in python.
            response = supabase.table("documents").select("filename, created_at, metadata").eq("agent_id", agent_id).execute()
            
            unique_docs = {}
            for row in response.data:
                fname = row.get("filename")
                if fname not in unique_docs:
                    unique_docs[fname] = {
                        "id": row.get("id", fname), # ID of first chunk
                        "filename": fname,
                        "created_at": row.get("created_at"),
                        "type": "web" if "WEB:" in fname else "file" 
                    }
            return list(unique_docs.values())
            
        except Exception as e:
            print(f"Failed to list documents: {e}")
            return []

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

    async def search(self, query: str, agent_id: str, filters: Dict[str, Any] = None, threshold: float = 0.75) -> List[Any]:
        """
        Advanced strict search for AgentRuntime.
        """
        embedding = self._get_embedding(query)
        supabase = get_supabase_client()
        
        filter_modes = filters.get("modes") if filters else None
        
        params = {
            "query_embedding": embedding,
            "match_threshold": threshold,
            "match_count": 5,
            "filter_agent_id": agent_id,
            "filter_modes": filter_modes
        }
        
        try:
             # Need a generic object to hold results, or simple dict
             class DocResult:
                 def __init__(self, id, content, score):
                     self.id = id
                     self.content = content
                     self.score = score

             response = supabase.rpc("match_documents", params).execute()
             
             results = []
             if response.data:
                 for item in response.data:
                     results.append(DocResult(item["id"], item["content"], item["similarity"]))
             
             return results
        except Exception as e:
            print(f"Strict search failed: {e}")
            return []

# We need the SQL for match_documents RPC. I will add it to the schema file.
