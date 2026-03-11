from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import httpx
import os
import logging
from svix.webhooks import Webhook, WebhookVerificationError
from app.services.recall.webrtc_handler import create_webrtc_answer
from app.services.ai.orchestrator import AIOrchestrator
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
RECALL_API_KEY = os.getenv("RECALL_API_KEY", "PLACEHOLDER_KEY")
RECALL_VERIFICATION_SECRET = os.getenv("RECALL_VERIFICATION_SECRET", "")
RECALL_REGION = os.getenv("RECALL_REGION", "us-east-1")

# Map regions to base URLs
if RECALL_REGION == "us-east-1":
    RECALL_BASE_URL = "https://api.recall.ai/api/v1"
else:
    RECALL_BASE_URL = f"https://{RECALL_REGION}.recall.ai/api/v1"

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://your-domain.com")

# Global store for active peer connections and bot metadata
active_connections = {}
bot_state = {} # bot_id -> {meeting_id, agent_id, orchestrator}

class JoinRequest(BaseModel):
    meeting_url: str
    bot_name: str = "Neuralis AI"
    meeting_id: str
    agent_id: str

@router.post("/join")
async def join_meeting(req: JoinRequest):
    """
    Task 1: Trigger Recall.ai API to send a bot into the meeting.
    """
    logger.info(f"Triggering Recall.ai join for: {req.meeting_url}")
    
    async with httpx.AsyncClient() as client:
        # We request realtime media by providing a callback URL for WebRTC signaling
        payload = {
            "meeting_url": req.meeting_url,
            "bot_name": req.bot_name,
            "realtime_media_opts": {
                "event_url": f"{WEBHOOK_URL}/api/v1/recall/webrtc-callback"
            }
        }
        
        try:
            response = await client.post(
                f"{RECALL_BASE_URL}/bot/",
                json=payload,
                headers={"Authorization": f"Token {RECALL_API_KEY}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Recall.ai API error: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.json())
            
            data = response.json()
            bot_id = data.get("id")
            if bot_id:
                bot_state[bot_id] = {
                    "meeting_id": req.meeting_id,
                    "agent_id": req.agent_id
                }
            
            return data
        except Exception as e:
            logger.exception("Failed to connect to Recall.ai")
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/webrtc-callback")
async def webrtc_callback(request: Request):
    """
    Task 2 & 3: Handle the WebRTC offer from Recall.ai with signature verification.
    """
    # 1. Get raw body and headers
    payload = await request.body()
    headers = request.headers
    
    # 2. Verify signature if secret is provided
    if RECALL_VERIFICATION_SECRET:
        try:
            wh = Webhook(RECALL_VERIFICATION_SECRET)
            # Svix expects the headers to contain:
            # Webhook-Id, Webhook-Timestamp, Webhook-Signature
            wh.verify(payload, headers)
            logger.info("Webhook signature verified successfully")
        except WebhookVerificationError as e:
            logger.error(f"Webhook verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
        except Exception as e:
            logger.error(f"Error during webhook verification: {e}")
            raise HTTPException(status_code=500, detail="Internal verification error")

    # 3. Process the event
    data = await request.json()
    event = data.get("event")
    
    if event == "realtime.webrtc_offer":
        bot_id = data["data"]["bot_id"]
        sdp_offer = data["data"]["sdp"]
        
        logger.info(f"Received WebRTC offer for bot {bot_id}")
        
        try:
            # 1. Fetch metadata for this bot
            state = bot_state.get(bot_id)
            if not state:
                logger.warning(f"No state found for bot {bot_id}. Using defaults.")
                state = {"meeting_id": "recall-bot", "agent_id": "default"}
            
            # 2. Initialize AI Orchestrator
            orchestrator = AIOrchestrator(
                meeting_id=state["meeting_id"],
                agent_id=state["agent_id"],
                voice_id=None 
            )
            state["orchestrator"] = orchestrator
            
            # 3. Start Orchestrator Pipeline
            asyncio.create_task(orchestrator.run_pipeline(tts_output_format="pcm_44100"))
            logger.info(f"AI Orchestrator started for bot {bot_id}")

            # 4. Create the answer and establish the connection
            sdp_answer, pc = await create_webrtc_answer(sdp_offer, orchestrator)
            
            # Store connection to keep it alive
            active_connections[bot_id] = pc
            
            # Cleanup on connection state change
            @pc.on("connectionstatechange")
            async def on_connectionstatechange():
                if pc.connectionState in ["closed", "failed", "disconnected"]:
                    logger.info(f"Connection for bot {bot_id} {pc.connectionState}")
                    active_connections.pop(bot_id, None)
                    bot_state.pop(bot_id, None)

            # Recall.ai expects the SDP answer in a JSON response
            return {"sdp": sdp_answer}
            
        except Exception as e:
            logger.exception(f"WebRTC negotiation failed for bot {bot_id}")
            raise HTTPException(status_code=500, detail="WebRTC Negotiation Failed")

    return {"status": "event_received"}
