import os
import json
from typing import AsyncGenerator, Dict, Any
from openai import AsyncOpenAI
from .base import LLMService
# FinOps hook
from ...services.finops_service import finops_service

class OpenAILLMService(LLMService):
    def __init__(self, user_id: str = None):
        # OpenRouter Support
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = None

        if os.getenv("OPENROUTER_API_KEY"):
            api_key = os.getenv("OPENROUTER_API_KEY")
            base_url = "https://openrouter.ai/api/v1"
            
        # USER OVERRIDE
        if user_id:
            from app.db.supabase import get_supabase_client
            try:
                supabase = get_supabase_client()
                settings = supabase.table("user_settings").select("api_keys").eq("user_id", user_id).single().execute()
                if settings.data and settings.data.get("api_keys"):
                    user_keys = settings.data["api_keys"]
                    if user_keys.get("openai"):
                        api_key = user_keys["openai"]
                        base_url = None # Reset unless we store openrouter key too
            except Exception as e:
                print(f"Failed to load user keys for LLM: {e}")

        if not api_key:
             print("Warning: No LLM API Key found")

        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def plan_response(self, context: str, history: list) -> Dict[str, Any]:
        """
        Planning Step: strictly JSON output to decide intent.
        """
        system_prompt = """
        You are the Brain of an autonomous AI agent. 
        Analyze the conversation context and produce a JSON response plan.
        
        Output Schema:
        {
            "intent": "answer" | "clarify" | "listen" | "deflect",
            "confidence": float (0.0-1.0),
            "tone": "neutral" | "empathetic" | "confident",
            "internal_monologue": "reasoning here"
        }
        """

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-1106-preview", # GPT-4 Turbo for JSON mode
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context: {context}\nHistory: {history[-3:]}"} # Last 3 turns
                ],
                response_format={"type": "json_object"},
                temperature=0.2 # Deterministic planning
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Planning Error: {e}")
            return {"intent": "answer", "confidence": 0.5, "tone": "neutral", "internal_monologue": "Error fallback"}

    async def generate_response(self, context: str, history: list, mode: str) -> AsyncGenerator[str, None]:
        """
        Generation Step: Stream actual words.
        """
        # Select prompt based on mode
        system_prompt_map = {
            "INTERVIEW": "You are a professional candidate. Answer using STAR method. Be confident but humble.",
            "STANDUP": "You are an engineer. Be concise. Format: Yesterday, Today, Blockers.",
            "GENERAL": "You are a helpful AI assistant."
        }
        
        # SAFETY OVERLAY (Compliance Layer)
        safety_system_prompt = (
            " IMPORTANT SAFETY RULES: "
            "1. You are an AI Agent, not a human. Never claim to be a human. "
            "2. If asked about your identity, state: 'I am an AI assistant'. "
            "3. You cannot hold government office, medical licenses, or legal authority. "
            "4. Do not invent facts about employment not in your context."
        )
        
        base_instruction = system_prompt_map.get(mode, system_prompt_map["GENERAL"])
        system_instruction = base_instruction + safety_system_prompt
        
        stream = await self.client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                 {"role": "system", "content": system_instruction},
                 *history, # Full history or windowed
                 {"role": "user", "content": context}
            ],
            stream=True,
            temperature=0.7
        )

        accumulated_text = ""
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                accumulated_text += text
                yield text
        
        # Log FinOps (Approximate token count for speed: chars/4)
        # In prod, use tiktoken
        input_tokens = len(system_instruction + context) / 4
        output_tokens = len(accumulated_text) / 4
        
        # Using a dummy session ID for now, usually passed in context
        await finops_service.log_cost("session_123", "LLM_TOKEN_INPUT", input_tokens, "OpenAI")
        await finops_service.log_cost("session_123", "LLM_TOKEN_OUTPUT", output_tokens, "OpenAI")
