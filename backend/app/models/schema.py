from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, constr, confloat

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)

class UserCreate(UserBase):
    password: constr(min_length=8)

class User(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    user_id: str
    age: int = Field(..., ge=13, le=100)
    weight_kg: float = Field(..., ge=30, le=300)
    height_cm: float = Field(..., ge=100, le=250)
    activity_level: str = Field(..., pattern="^(sedentary|light|moderate|very_active|extra_active)$")
    fitness_goal: str = Field(..., pattern="^(lose_weight|maintain|gain_muscle)$")
    weekly_budget: float = Field(..., ge=20)
    dietary_restrictions: List[str] = []
    location_zip: str = Field(..., min_length=5, max_length=10)
    
    class Config:
        from_attributes = True

class MacroTargets(BaseModel):
    calories: int = Field(..., ge=1200, le=5000)
    protein_g: int = Field(..., ge=30, le=300)
    carbs_g: int = Field(..., ge=50, le=500)
    fats_g: int = Field(..., ge=20, le=200)
    user_id: str

class Store(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    place_id: str  # Google Places ID 