from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.api import deps
from app.crud import user as crud_user
from app.schemas import UserCreate, User, Token

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Sets HttpOnly cookie for extra security in browser contexts.
    """
    user = await crud_user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        # secure=True, # TODO: Enable in Production (requires HTTPS)
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/signup", response_model=User)
async def signup(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db)  
) -> Any:
    """
    Create new user without the need to be logged in.
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.get("/me", response_model=User)
async def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
