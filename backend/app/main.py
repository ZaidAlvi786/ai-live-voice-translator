from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="NEURALIS API",
    description="Backend service for NEURALIS Spatial Agent Platform",
    version="0.1.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "alive", "service": "neuralis-api"}

# Include Routers
from app.api.v1 import agents, training, ws, meetings, auth, users, notifications, recall
app.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])
app.include_router(training.router, prefix="/api/v1/training", tags=["training"])
app.include_router(meetings.router, prefix="/api/v1/meetings", tags=["meetings"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(ws.router, prefix="/api/v1", tags=["websockets"])
app.include_router(recall.router, prefix="/api/v1/recall", tags=["recall"])

@app.get("/")
async def root():
    return {"message": "Welcome to NEURALIS Intelligence Core"}
