from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel, EmailStr

from ..models.schema import UserCreate, User
from ..core.supabase import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup", response_model=User)
async def signup(user_data: UserCreate):
    """Register a new user."""
    try:
        supabase = get_supabase()
        # Sign up user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Failed to create user")
            
        return User(
            id=auth_response.user.id,
            email=auth_response.user.email,
            full_name=user_data.full_name,
            created_at=auth_response.user.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(payload: LoginPayload):
    """Log in an existing user."""
    try:
        supabase = get_supabase()
        auth_response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": auth_response.user
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/me", response_model=User)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user."""
    from ..core.auth import get_current_user
    return await get_current_user(credentials) 