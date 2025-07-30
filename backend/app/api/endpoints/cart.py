from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, List
from ...models.schema import User
from ...core.auth import get_current_user
from ...core.supabase import get_supabase_admin
from ...services.cart_export import get_cart_url, get_cart_urls_for_all_retailers, get_available_retailers

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("/retailers")
async def get_retailers(current_user: User = Depends(get_current_user)):
    """Get list of available retailers for cart export."""
    return {"retailers": get_available_retailers()}

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
        raise HTTPException(status_code=404, detail=f"No product mappings found for {retailer}")
    return {"checkout_url": url}

@router.get("/{plan_id}/all")
async def export_cart_all_retailers(plan_id: str, current_user: User = Depends(get_current_user)):
    """Return cart URLs for all available retailers."""
    supabase = get_supabase_admin()
    # fetch aggregated ingredient list
    join = supabase.table("meal_plan_recipes").select("recipes(recipe_ingredients(quantity,unit,ingredients(name)))").eq("meal_plan_id", plan_id).execute()
    if join.error:
        raise HTTPException(status_code=500, detail="Failed to fetch plan data")
    
    ingredients = []
    for row in join.data or []:
        for ri in row["recipes"]["recipe_ingredients"] or []:
            ingredients.append({"name": ri["ingredients"]["name"], "unit": ri["unit"]})
    
    urls = get_cart_urls_for_all_retailers(ingredients)
    retailers = get_available_retailers()
    
    # Combine retailer info with URLs
    result = []
    for retailer in retailers:
        retailer_id = retailer["id"]
        result.append({
            "id": retailer_id,
            "name": retailer["name"],
            "url": urls.get(retailer_id),
            "available": retailer_id in urls
        })
    
    return {"retailers": result} 