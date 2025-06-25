from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field

class Ingredient(BaseModel):
    name: str
    category: str
    unit: str
    quantity: float = Field(1, ge=0)
    price_per_unit: float

class Recipe(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: List[str]
    prep_time_minutes: int = Field(..., ge=0)
    cook_time_minutes: int = Field(..., ge=0)
    servings: int = Field(..., ge=1)
    calories_per_serving: int = Field(..., ge=0)
    protein_per_serving: float = Field(..., ge=0)
    carbs_per_serving: float = Field(..., ge=0)
    fat_per_serving: float = Field(..., ge=0)
    ingredients: List[Ingredient]
    dietary_tags: List[str] = []

class Meal(BaseModel):
    meal_type: str = Field(..., pattern="^(breakfast|lunch|dinner|snack)$")
    recipe: Recipe
    servings: int = Field(1, ge=1)

class DayPlan(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    meals: List[Meal]

class MealPlan(BaseModel):
    id: Optional[str] = None
    start_date: date
    end_date: date
    days: List[DayPlan]
    total_cost: float = Field(..., ge=0)

class MealPlanRequest(BaseModel):
    start_date: date
    end_date: date
    dietary_restrictions: List[str] = []
    weekly_budget: float = Field(..., ge=0)
    calories_per_day: int = Field(..., ge=1200, le=5000)
    protein_per_day: float = Field(..., ge=30, le=300)
    carbs_per_day: float = Field(..., ge=50, le=500)
    fat_per_day: float = Field(..., ge=20, le=200)
    location_zip: str = Field(..., min_length=5, max_length=10)
    store_place_ids: List[str] = [] 