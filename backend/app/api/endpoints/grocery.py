from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Tuple

from ...models.grocery import GroceryItem, GroceryListResponse
from ...models.schema import User
from ...core.auth import get_current_user
from ...core.supabase import get_supabase_admin
from ...services.pricing import get_price_per_unit

router = APIRouter(prefix="/grocery", tags=["grocery"])

@router.get("/{plan_id}", response_model=GroceryListResponse)
async def get_grocery_list(plan_id: str, current_user: User = Depends(get_current_user)):
    """Return aggregated grocery list with cheapest prices."""
    try:
        supabase = get_supabase_admin()
        # Verify plan belongs to user via RLS policies; fetch stores for plan
        stores_res = supabase.table("meal_plan_stores").select("place_id").eq("meal_plan_id", plan_id).execute()
        place_ids = [row["place_id"] for row in (stores_res.data or [])]

        # Fetch recipe ingredients for all recipes in the plan
        join_res = supabase.table("meal_plan_recipes").select("servings, recipes(id,name,recipe_ingredients(quantity,unit,ingredients(name)))").eq("meal_plan_id", plan_id).execute()
        if join_res.error:
            raise HTTPException(status_code=500, detail="Failed to fetch plan data")

        aggregate: Dict[Tuple[str,str], float] = {}
        for row in (join_res.data or []):
            servings = row.get("servings", 1)
            recipes_block = row.get("recipes", {}) or {}
            for ri in recipes_block.get("recipe_ingredients", []) or []:
                ing_name = (ri.get("ingredients", {}) or {}).get("name")
                unit = ri.get("unit")
                qty = ri.get("quantity", 0) * servings
                if not ing_name or not unit:
                    continue
                key = (ing_name.lower(), unit.lower())
                aggregate[key] = aggregate.get(key, 0) + qty

        items: list[GroceryItem] = []
        total_cost = 0.0
        for (name, unit), quantity in aggregate.items():
            ppu = get_price_per_unit(place_ids, name, unit, default=None)
            cost = ppu * quantity if ppu is not None else None
            if cost:
                total_cost += cost
            items.append(GroceryItem(name=name, unit=unit, quantity=quantity, price_per_unit=ppu, cost=cost))

        return GroceryListResponse(plan_id=plan_id, items=items, total_cost=total_cost if total_cost else None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 