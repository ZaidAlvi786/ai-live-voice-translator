import re
import logging
from typing import Optional, List, Any, Dict
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class BoundaryVerdict(BaseModel):
    decision: str            # 'ALLOW_FAST', 'ALLOW_DEEP', 'REFUSE'
    confidence: float        # 0.0 to 1.0
    refusal_reason: Optional[str] = None      # 'malicious', 'off_topic', 'mode_violation', 'low_confidence'
    suggested_template: Optional[str] = None  # Pre-baked text for refusal
    intent: str              # 'greeting', 'technical', 'personal', 'meta', 'unknown'

class QuestionBoundaryDetector:
    """
    Deterministic safety gate for the Agent.
    Executes BEFORE the LLM is called.
    """
    
    # 1. INPUT GUARD (Regex)
    # Block obvious jailbreaks or illegal concepts immediately.
    MALICIOUS_PATTERNS = [
        r"(ignore|forget) (all )?instructions",
        r"system prompt",
        r"you are (a|an) ai", # Meta-prompting check (optional, strictly enforcing outcome)
        r"simulat(e|ion)",
        r"(write|generate) malware",
        r"illegal",
        r"hack",
        r"salary", # Often best to deflect via specific logic, but can guard here
        r"immigration", # Legal guard
        r"visa sponsorship" # Legal guard
    ]

    def __init__(self):
        self.compiled_patterns = [re.compile(p, re.IGNORECASE) for p in self.MALICIOUS_PATTERNS]

    async def evaluate(self, query: str, cognitive_cache: Any, mode: str, agent_identity: Any) -> BoundaryVerdict:
        """
        Main evaluation pipeline.
        Returns a Verdict that dictates the Runtime's next step.
        """
        
        # STAGE 1: INPUT GUARD (0ms)
        for pattern in self.compiled_patterns:
            if pattern.search(query):
                logger.warning(f"QBD Input Guard Triggered: {query}")
                return BoundaryVerdict(
                    decision="REFUSE",
                    confidence=1.0,
                    refusal_reason="malicious",
                    suggested_template="I cannot discuss that topic.",
                    intent="malicious"
                )

        # STAGE 2: INTENT CLASSIFIER (Heuristic)
        # Simple rule-based intent detection for latency.
        intent = self._classify_intent(query)
        
        if intent == "greeting":
            return BoundaryVerdict(
                decision="ALLOW_FAST",
                confidence=1.0,
                intent="greeting"
            )
        
        # STAGE 3: MODE GATE
        # Enforce Mode-specific constraints.
        if mode == "standup":
            # In standup, we block broad, deep questions.
            if self._is_deep_question(query):
                return BoundaryVerdict(
                    decision="REFUSE",
                    confidence=0.9,
                    refusal_reason="mode_violation",
                    suggested_template="Let's save the deep dive for a follow-up; I want to focus on today's status.",
                    intent=intent
                )
        
        # STAGE 4: KNOWLEDGE CHECK (Cognitive Cache)
        # We assume cognitive_cache is passed from Runtime.
        # We need to compute embedding for query here. 
        # CAUTION: Evaluating QBD requires embeddings. 
        # If Runtime hasn't computed them yet, we might need a way to do it.
        # For now, we assume Runtime will pass the *search results* or we rely on the Runtime to do the search 
        # and then call QBD validation? 
        # BETTER ARCHITECTURE: QBD should probably own the retrieval decision or be called *after* initial retrieval 
        # but *before* LLM generation. 
        # Let's pivot: The plan says "QBD MUST run before AgentRuntime". 
        # But logically, checking Knowledge REQUIRES retrieval.
        # Decision: QBD `evaluate` will be called inside `AgentRuntime.generate_response` *after* retrieval (stage 1) 
        # but *before* LLM (Stage 5).
        # Actually, if we want QBD to run *before* RAG to save costs, we can't check knowledge coverage.
        # Plan Re-alignment: QBD runs *before* RAG for Stages 1-3. 
        # QBD Stage 4 runs *after* RAG.
        # Let's support a 2-pass evaluaton or just one pass post-retrieval?
        # The prompt asks for QBD to run "before RAG retrieval".
        # If so, we can't check knowledge coverage unless we have a separate fast index.
        # Compromise: We implement Stage 4 as a check on the *CognitiveCache* (fast in-memory).
        # If CognitiveCache is empty or miss, we deflect? No, we might fall back to DB RAG.
        # Let's strictly implement the Plan: "Knowledge Coverage Check: Vector similarity against agent knowledge index".
        # This implies we DO search.
        
        # For this implementation, we will return a special decision allowing the Runtime to perform retrieval 
        # if it passes gates 1-3. Then Runtime calls QBD.verify_knowledge().
        
        return BoundaryVerdict(
            decision="PROCEED_TO_RETRIEVAL",
            confidence=0.5,
            intent=intent
        )

    def verify_knowledge(self, docs: List[Any], threshold: float = 0.75) -> BoundaryVerdict:
        """
        Stage 4: Executed after retrieval to validate coverage.
        """
        if not docs:
             return BoundaryVerdict(
                decision="REFUSE",
                confidence=1.0,
                refusal_reason="low_confidence",
                suggested_template="I don't have the specific details on that right now.",
                intent="unknown"
            )

        top_score = docs[0].score # Assuming Normalized RAG object
        
        if top_score < threshold:
             return BoundaryVerdict(
                decision="REFUSE",
                confidence=1.0,
                refusal_reason="low_confidence",
                suggested_template="I don't have the specific details on that right now.",
                intent="unknown"
            )
            
        return BoundaryVerdict(
            decision="ALLOW_DEEP", # Default to Deep, Runtime can optimize to Fast if query is short
            confidence=top_score,
            intent="technical" # Assumed if we found docs
        )

    def _classify_intent(self, query: str) -> str:
        q_lower = query.lower()
        if any(x in q_lower for x in ["hi", "hello", "hey", "good morning", "can you hear me"]):
            return "greeting"
        if any(x in q_lower for x in ["tell me about yourself", "experience", "background", "resume"]):
            return "personal"
        return "technical" # Default assumption

    def _is_deep_question(self, query: str) -> bool:
        # Heuristic: "How", "Why", "Explain", "Describe" usually imply depth.
        # Length > 10 words implies complexity.
        q_lower = query.lower()
        if len(query.split()) > 10:
            return True
        if any(x in q_lower for x in ["how", "why", "explain", "architecture", "design"]):
            return True
        return False
