from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.schema import User
from ..core.auth import get_current_user
from ..core.supabase import get_supabase_admin
from ..services.cart_export import get_cart_url

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("/{plan_id}")
async def export_cart(plan_id: str, retailer: str = Query("instacart"), current_user: User = Depends(get_current_user)):
    """Return a redirect URL to the retailer with items prefilled."""
    supabase = get_supabase_admin()
    # fetch aggregated ingredient list similar to grocery endpoint but cheaper via view
    ing_res = supabase.rpc("get_grocery_for_plan", {"p_plan_id": plan_id}).execute() if False else None  # placeholder for future
    if not ing_res or not ing_res.data:
        # fallback: fetch via recipe_joins (simpler, slower but fine here)
        join = supabase.table("meal_plan_recipes").select("recipes(recipe_ingredients(quantity,unit,ingredients(name)))").eq("meal_plan_id", plan_id).execute()
        if join.error:
            raise HTTPException(status_code=500, detail="Failed to fetch plan data")
        ingredients = []
        for row in join.data or []:
            for ri in row["recipes"]["recipe_ingredients"] or []:
                ingredients.append({"name": ri["ingredients"]["name"], "unit": ri["unit"]})
    else:
        ingredients = ing_res.data

    url = get_cart_url(ingredients, retailer)
    if not url:
        raise HTTPException(status_code=404, detail="No product mappings for these items")
    return {"checkout_url": url} 