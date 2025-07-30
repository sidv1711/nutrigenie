from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime

from ..models.schema import UserProfile, User
from ..core.supabase import get_supabase, get_supabase_admin
from ..core.auth import get_current_user

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.post("", response_model=UserProfile)
async def create_profile(
    profile_data: UserProfile,
    current_user: User = Depends(get_current_user)
):
    """Create a new user profile."""
    try:
        supabase = get_supabase_admin()
        
        # Ensure profile belongs to authenticated user
        profile_data.user_id = current_user.id
        
        # Insert profile into database (table name is 'profiles')
        result = supabase.table("profiles").insert({
            "user_id": profile_data.user_id,
            "name": profile_data.name,
            "age": profile_data.age,
            "gender": profile_data.gender,
            "weight_kg": profile_data.weight_kg,
            "height": profile_data.height,
            "activity_level": profile_data.activity_level,
            "fitness_goal": profile_data.fitness_goal,
            "weekly_budget": profile_data.weekly_budget,
            "dietary_restrictions": profile_data.dietary_restrictions,
            "zip_code": profile_data.zip_code
        }).execute()

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create profile")
            
        return UserProfile(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    try:
        supabase = get_supabase_admin()
        
        result = supabase.table("profiles").select("*").eq("user_id", current_user.id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return UserProfile(**result.data)
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=404, detail="Profile not found")

@router.put("", response_model=UserProfile)
async def update_profile(
    profile_data: UserProfile,
    current_user: User = Depends(get_current_user)
):
    """Update the current user's profile."""
    try:
        print(f"Update profile request for user {current_user.id}")
        print(f"Profile data: {profile_data}")
        print(f"Dietary restrictions: {profile_data.dietary_restrictions}")
        supabase = get_supabase_admin()
        
        # Ensure profile belongs to authenticated user
        profile_data.user_id = current_user.id
        
        # Update profile in database
        result = supabase.table("profiles").update({
            "name": profile_data.name,
            "age": profile_data.age,
            "gender": profile_data.gender,
            "weight_kg": profile_data.weight_kg,
            "height": profile_data.height,
            "activity_level": profile_data.activity_level,
            "fitness_goal": profile_data.fitness_goal,
            "weekly_budget": profile_data.weekly_budget,
            "dietary_restrictions": profile_data.dietary_restrictions,
            "zip_code": profile_data.zip_code,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", current_user.id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return UserProfile(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("", status_code=204)
async def delete_profile(current_user: User = Depends(get_current_user)):
    """Delete the current user's profile."""
    try:
        supabase = get_supabase_admin()
        
        result = supabase.table("profiles").delete().eq("user_id", current_user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 