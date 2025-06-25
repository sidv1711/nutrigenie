from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime

from ..models.schema import UserProfile
from ..core.supabase import get_supabase

router = APIRouter(prefix="/profiles", tags=["profiles"])
security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get the current user's ID from their auth token."""
    try:
        supabase = get_supabase()
        user_resp = supabase.auth.get_user(credentials.credentials)
        user = getattr(user_resp, "user", user_resp)
        return user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("", response_model=UserProfile)
async def create_profile(
    profile_data: UserProfile,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new user profile."""
    try:
        supabase = get_supabase()
        
        # Ensure profile belongs to authenticated user
        profile_data.user_id = user_id
        
        # Insert profile into database (table name is 'profiles')
        result = supabase.table("profiles").insert({
            "user_id": profile_data.user_id,
            "age": profile_data.age,
            "weight_kg": profile_data.weight_kg,
            "height_cm": profile_data.height_cm,
            "activity_level": profile_data.activity_level,
            "fitness_goal": profile_data.fitness_goal,
            "weekly_budget": profile_data.weekly_budget,
            "dietary_restrictions": profile_data.dietary_restrictions,
            "location_zip": profile_data.location_zip
        }).execute()

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create profile")
            
        return UserProfile(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=UserProfile)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    """Get the current user's profile."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("user_profiles").select("*").eq("user_id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return UserProfile(**result.data)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Profile not found")

@router.put("", response_model=UserProfile)
async def update_profile(
    profile_data: UserProfile,
    user_id: str = Depends(get_current_user_id)
):
    """Update the current user's profile."""
    try:
        supabase = get_supabase()
        
        # Ensure profile belongs to authenticated user
        profile_data.user_id = user_id
        
        # Update profile in database
        result = supabase.table("user_profiles").update({
            "age": profile_data.age,
            "weight_kg": profile_data.weight_kg,
            "height_cm": profile_data.height_cm,
            "activity_level": profile_data.activity_level,
            "fitness_goal": profile_data.fitness_goal,
            "weekly_budget": profile_data.weekly_budget,
            "dietary_restrictions": profile_data.dietary_restrictions,
            "location_zip": profile_data.location_zip,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return UserProfile(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("", status_code=204)
async def delete_profile(user_id: str = Depends(get_current_user_id)):
    """Delete the current user's profile."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 