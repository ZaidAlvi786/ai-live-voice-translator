import json
import asyncio
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.services.ai.base import AIService
from app.services.ai.llm_service import OpenAILLMService
from app.services.ai.rag_service import RAGService
from app.services.ai.question_boundary_detector import QuestionBoundaryDetector
import logging

logger = logging.getLogger(__name__)

class AgentIdentity(BaseModel):
    name: str
    role: str
    years_experience: int
    communication_style: str  # 'confident', 'concise', 'casual', 'formal'
    guardrails: Dict

class CognitiveCache:
    """
    In-memory vector store for the active session.
    Eliminates DB latency for high-frequency access.
    """
    def __init__(self):
        self._cache: List[Dict[str, Any]] = []
        self._frozen = False

    def add_document(self, doc_id: str, content: str, embedding: List[float], metadata: Dict):
        if self._frozen:
            return
        self._cache.append({
            "id": doc_id,
            "content": content,
            "embedding": embedding,
            "metadata": metadata
        })

    def freeze(self):
        self._frozen = True
        logger.info(f"CognitiveCache frozen with {len(self._cache)} items.")

    def search(self, query_embedding: List[float], limit: int = 3, threshold: float = 0.75) -> List[Any]:
        """
        O(N) Cosine Similarity in pure Python (numpy-free for minimal dependency).
        Efficient enough for < 1000 items (typical resume/project scale).
        """
        if not self._cache:
            return []

        results = []
        # Simple dot product for normalized vectors (assuming OpenAI embeddings are normalized)
        for item in self._cache:
            score = sum(a * b for a, b in zip(item["embedding"], query_embedding))
            if score >= threshold:
                results.append((score, item))
        
        results.sort(key=lambda x: x[0], reverse=True)
        
        # Return object-like structure to match RAGService API
        class CacheResult:
            def __init__(self, id, content, score):
                self.id = id
                self.content = content
                self.score = score
                
        return [CacheResult(r[1]["id"], r[1]["content"], r[0]) for r in results[:limit]]

class AgentRuntime(AIService):
    """
    The enforceable runtime for an Agent.
    Strictly adheres to:
    1. Immutable Identity (loaded at start)
    2. Mode-specific logic (Interview vs Standup)
    3. RAG-enforced knowledge boundaries (deflects if unknown)
    """

    def __init__(self, agent_id: str, identity: AgentIdentity, mode: str = "interview"):
        super().__init__()
        self.agent_id = agent_id
        self.identity = identity
        self.mode = mode  # 'interview' | 'standup'
        self.llm = OpenAILLMService()
        self.rag = RAGService()
        
        # Runtime State
        self.standup_context: Optional[str] = None
        self.cognitive_cache = CognitiveCache()
        self.warm_started = False
        self.qbd = QuestionBoundaryDetector()
    
    async def warm_start(self):
        """
        Pre-fetch documents relevant to the current mode into memory.
        """
        logger.info(f"Warm-starting Agent {self.agent_id} for mode {self.mode}")
        # Temporary Stub: We mark as warm to allow generation to proceed.
        # In a real implementation with `rag.list_documents_with_embeddings`, we would populate self.cognitive_cache here.
        self.warm_started = True

    def set_mode(self, mode: str):
        if mode not in ["interview", "standup"]:
            raise ValueError(f"Invalid mode: {mode}")
        self.mode = mode
        logger.info(f"Agent {self.agent_id} switched to {mode} mode.")

    def set_standup_context(self, context: str):
        """Ephemeral context for Standup mode only."""
        self.standup_context = context

    async def generate_response(self, query: str, meeting_id: str) -> Dict:
        """
        Main entry point for generating a response.
        Enforces all constraints with Dual-Loop Logic & Question Boundary Detector.
        """
        
        # --- STAGE 0: QUESTION BOUNDARY DETECTOR (Pre-Retrieval) ---
        qbd_verdict = await self.qbd.evaluate(query, self.cognitive_cache, self.mode, self.identity)
        
        if qbd_verdict.decision == "REFUSE":
            return {
                "text": qbd_verdict.suggested_template or "I cannot answer that.",
                "retrieved_sources": [],
                "confidence": 1.0,
                "decision_path": f"qbd_refusal_{qbd_verdict.refusal_reason}",
                "loop_used": "FAST"
            }
        
        if qbd_verdict.decision == "ALLOW_FAST" and qbd_verdict.intent == "greeting":
             # Fast greeting short-circuit
             return {
                 "text": "Hello! I am ready to begin.",
                 "retrieved_sources": [],
                 "confidence": 1.0,
                 "decision_path": "qbd_fast_greeting",
                 "loop_used": "FAST"
             }

        # --- DUAL-LOOP ROUTER ---
        # Heuristic: Short query (< 8 words) = Fast Loop.
        # Complex query = Deep Loop.
        is_fast_loop = len(query.split()) < 8 and "?" not in query 
        
        loop_type = "FAST" if is_fast_loop else "DEEP"
        # ------------------------

        # 1. RETRIEVAL (STRICT)
        # Try Cache first (if implemented), else DB.
        # We only retrieve docs allowed for the current mode.
        allowed_modes = [self.mode]
        if self.mode == "standup":
             allowed_modes.append("general")

        docs = await self.rag.search(
            query=query, 
            agent_id=self.agent_id, 
            filters={"modes": allowed_modes},
            threshold=0.75
        )

        # 2. DECISION: DEFINE CONTEXT
        context_str = ""
        retrieved_ids = []
        
        if self.mode == "standup" and self.standup_context:
            context_str += f"STANDUP CONTEXT (Ephemeral):\n{self.standup_context}\n\n"

        if docs:
            # --- STAGE 4: QBD KNOWLEDGE VERIFICATION ---
            # Verify if retrieved knowledge is sufficient
            knowledge_verdict = self.qbd.verify_knowledge(docs)
            if knowledge_verdict.decision == "REFUSE":
                return {
                    "text": knowledge_verdict.suggested_template,
                    "retrieved_sources": [d.id for d in docs],
                    "confidence": knowledge_verdict.confidence,
                    "decision_path": f"qbd_knowledge_refusal",
                    "loop_used": "FAST"
                }

            context_str += "KNOWLEDGE BASE:\n" + "\n".join([d.content for d in docs])
            retrieved_ids = [d.id for d in docs]
        
        # 3. FALLBACK / REFUSAL
        if not context_str and len(query.split()) > 3:
             if loop_type == "FAST":
                 # Fast loop refusal
                 return {
                     "text": "Could you clarify that?",
                     "retrieved_sources": [],
                     "confidence": 0.0,
                     "decision_path": "fast_refusal",
                     "loop_used": loop_type
                 }

        # 4. SYSTEM PROMPT COMPILATION
        system_prompt = self._compile_system_prompt()

        # 5. GENERATE (Dual-Loop optimized)
        max_tokens = 50 if is_fast_loop else self.identity.guardrails.get("max_answer_seconds", 30) * 8
        
        try:
            # If Fast Loop, we append a "Be extremely concise" instruction
            final_system_prompt = system_prompt
            if is_fast_loop:
                final_system_prompt += "\n[SPEED CONSTRAINT] Answer in 1 sentence. < 15 words."

            response_text = await self.llm.generate(
                system_prompt=final_system_prompt,
                user_prompt=f"Context:\n{context_str}\n\nUser Query: {query}",
                max_tokens=int(max_tokens)
            )
            
            # Post-processing: Check if LLM refused
            decision = "retrieval"
            if "I don't have that information" in response_text:
                decision = "refusal"

            return {
                "text": response_text,
                "retrieved_sources": retrieved_ids,
                "confidence": docs[0].score if docs else 0.0,
                "decision_path": decision,
                "loop_used": loop_type
            }

        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            return {
                "text": "I am experiencing a temporary system error.",
                "retrieved_sources": [],
                "confidence": 0.0,
                "decision_path": "error"
            }

    def _compile_system_prompt(self) -> str:
        """
        Constructs the immutable system prompt based on Identity + Mode.
        """
        base_prompt = (
            f"You are {self.identity.name}, a {self.identity.role} with {self.identity.years_experience} years of expertise.\n"
            f"Communication Style: {self.identity.communication_style.upper()}.\n"
            "You are speaking on behalf of a user in a meeting.\n"
        )

        constraints = (
            "CRITICAL RULES:\n"
            "1. You may ONLY answer using the provided Context.\n"
            "2. If the answer is not in the Context, you MUST say: 'I don't have that information right now.'\n"
            "3. Do NOT make up facts. Do NOT speculate.\n"
            "4. Keep answers concise and spoken-word friendly.\n"
        )

        mode_instruction = ""
        if self.mode == "interview":
            mode_instruction = (
                "MODE: INTERVIEW\n"
                "- Focus on your professional experience.\n"
                "- Be formal, impressive, and precise.\n"
            )
        elif self.mode == "standup":
            mode_instruction = (
                "MODE: STANDUP\n"
                "- Focus on the 'STANDUP CONTEXT'.\n"
                "- Be casual, quick, and to the point.\n"
            )

        return base_prompt + constraints + mode_instruction
