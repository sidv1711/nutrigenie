from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...models.meal_plan import MealPlan, MealPlanRequest
from ...services.meal_plan import generate_meal_plan
from ...db.session import get_db
from ...core.auth import get_current_user
from ...models.schema import User

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])

@router.post("/generate")
async def create_meal_plan(
    request: MealPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a personalized meal plan based on user preferences and requirements.
    """
    try:
        meal_plan, plan_id = generate_meal_plan(request, current_user.id)
        return {"plan_id": plan_id, "plan": meal_plan}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate meal plan: {str(e)}"
        )

@router.get("/{plan_id}")
async def get_meal_plan(plan_id: str, current_user: User = Depends(get_current_user)):
    """Return the stored meal plan header row (recipes to be added later)."""
    try:
        from ...core.supabase import get_supabase_admin
        import logging, traceback
        supabase = get_supabase_admin()
        # get header row
        plan_header = supabase.table("meal_plans").select("id, start_date, end_date, total_cost").eq("id", plan_id).single().execute()
        if not plan_header.data:
            raise HTTPException(status_code=404, detail="Meal plan not found")

        # fetch meals with joined recipe
        meals_res = supabase.table("meal_plan_recipes").select("meal_type, day_of_week, servings, recipes(*)").eq("meal_plan_id", plan_id).execute()

        days_map = {}
        for rec in meals_res.data or []:
            day_idx = rec["day_of_week"]
            if day_idx not in days_map:
                days_map[day_idx] = []
            # Build meal object
            recipe_row = rec["recipes"]
            meal_obj = {
                "meal_type": rec["meal_type"],
                "servings": rec["servings"],
                "recipe": {
                    "name": recipe_row["name"],
                    "description": recipe_row.get("description"),
                    "instructions": recipe_row.get("instructions", []),
                    "prep_time_minutes": recipe_row.get("prep_time_minutes"),
                    "cook_time_minutes": recipe_row.get("cook_time_minutes"),
                    "servings": recipe_row.get("servings"),
                    "calories_per_serving": recipe_row.get("calories_per_serving"),
                    "protein_per_serving": recipe_row.get("protein_per_serving"),
                    "carbs_per_serving": recipe_row.get("carbs_per_serving"),
                    "fat_per_serving": recipe_row.get("fat_per_serving"),
                    "ingredients": [],
                    "dietary_tags": recipe_row.get("dietary_tags", []),
                },
            }
            days_map[day_idx].append(meal_obj)

            # Populate ingredients list for this recipe
            recipe_id_val = recipe_row["id"]
            if recipe_id_val:
                # Grab price information from the joined ingredients row as well
                ing_res = supabase.table("recipe_ingredients").select("quantity, unit, ingredients(name, category, price_per_unit)").eq("recipe_id", recipe_id_val).execute()
                ingredients_list = []
                for ing_row in ing_res.data or []:
                    ing_base = ing_row.get("ingredients", {}) or {}
                    ingredients_list.append({
                        "name": ing_base.get("name"),
                        "category": ing_base.get("category"),
                        "unit": ing_row.get("unit"),
                        "quantity": ing_row.get("quantity"),
                        "price_per_unit": ing_base.get("price_per_unit"),
                    })
                meal_obj["recipe"]["ingredients"] = ingredients_list

        days_list = [
            {"day_of_week": idx, "meals": days_map[idx]} for idx in sorted(days_map.keys())
        ]

        # Fetch selected stores for this plan
        plan_stores_res = supabase.table("meal_plan_stores").select("place_id").eq("meal_plan_id", plan_id).execute()
        store_ids = [row["place_id"] for row in (plan_stores_res.data or [])]
        stores_list = []
        if store_ids:
            stores_res = supabase.table("stores").select("place_id,name").in_("place_id", store_ids).execute()
            stores_list = stores_res.data or []

        return {
            "plan_id": plan_header.data["id"],
            "start_date": plan_header.data["start_date"],
            "end_date": plan_header.data["end_date"],
            "total_cost": plan_header.data["total_cost"],
            "days": days_list,
            "stores": stores_list,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error fetching meal plan", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{plan_id}", status_code=204)
async def delete_meal_plan(plan_id: str, current_user: User = Depends(get_current_user)):
    """Delete a meal plan the current user owns (cascade deletes linked recipes & stores)."""
    from ...core.supabase import get_supabase_admin
    supabase = get_supabase_admin()

    # Verify ownership first (avoid PGRST116 by limit 1)
    row = supabase.table("meal_plans").select("user_id").eq("id", plan_id).limit(1).execute()
    if not row.data or len(row.data) == 0:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    owner_id = row.data[0]["user_id"]
    if str(owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this plan")

    try:
        supabase.table("meal_plans").delete().eq("id", plan_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # FastAPI will send 204 with empty body
    return 