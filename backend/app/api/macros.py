from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Literal
from ..core.supabase import get_supabase
from ..models.schema import MacroTargets
from pydantic import BaseModel, Field

router = APIRouter(prefix="/macros", tags=["macros"])
security = HTTPBearer()

class MacroInput(BaseModel):
    age: int = Field(..., ge=13, le=100)
    gender: Literal["male", "female"]
    weight_kg: float = Field(..., ge=30, le=300)
    height_cm: float = Field(..., ge=100, le=250)
    activity_level: Literal["sedentary", "light", "moderate", "active", "veryActive"]
    fitness_goal: Literal["lose_weight", "maintain", "gain_muscle"] = "maintain"

# Activity multipliers
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "veryActive": 1.9,
}

# Goal adjustment factors (percentage change to TDEE)
GOAL_MULTIPLIERS = {
    "lose_weight": 0.85,  # -15%
    "maintain": 1.0,
    "gain_muscle": 1.15,  # +15%
}

@router.post("/compute", response_model=MacroTargets)
async def calculate_macros(
    data: MacroInput,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Calculate daily calories and macronutrient targets and persist them."""
    try:
        supabase = get_supabase()
        user_resp = supabase.auth.get_user(credentials.credentials)
        user = getattr(user_resp, "user", user_resp)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = user.id

        calories, protein_g, carbs_g, fats_g = compute_macros(data)

        # Persist to nutrition_requirements table (upsert)
        supabase.table("nutrition_requirements").upsert(
            {
                "user_id": user_id,
                "calories": calories,
                "protein_grams": protein_g,
                "carbs_grams": carbs_g,
                "fat_grams": fats_g,
            },
            on_conflict="user_id"
        ).execute()

        return MacroTargets(
            user_id=user_id,
            calories=calories,
            protein_g=protein_g,
            carbs_g=carbs_g,
            fats_g=fats_g,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Pure function for unit tests
def compute_macros(data: MacroInput):
    """Return (calories, protein_g, carbs_g, fats_g) for given input."""
    # BMR using Mifflin-St Jeor
    base_bmr = 10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age
    bmr = base_bmr + 5 if data.gender == "male" else base_bmr - 161

    tdee = bmr * ACTIVITY_MULTIPLIERS[data.activity_level]
    calories = int(tdee * GOAL_MULTIPLIERS[data.fitness_goal])

    # Macro split: 30% P, 50% C, 20% F
    protein_g = int(round((calories * 0.30) / 4))
    carbs_g = int(round((calories * 0.50) / 4))
    fats_g = int(round((calories * 0.20) / 9))

    return calories, protein_g, carbs_g, fats_g 