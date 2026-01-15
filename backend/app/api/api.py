from fastapi import APIRouter
from app.api.v1 import auth, websocket

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(websocket.router, tags=["signaling"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
