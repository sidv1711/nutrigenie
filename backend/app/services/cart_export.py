from typing import List, Optional
from .unit_conversion import normalize
from ..core.supabase import get_supabase_admin


def build_instacart_url(product_ids: List[str]) -> str:
    # Instacart shareable cart format (simplified placeholder)
    joined = ",".join(product_ids)
    return f"https://www.instacart.com/store/checkout_v3?items={joined}"


def get_cart_url(ingredients: List[dict], retailer: str = "instacart") -> Optional[str]:
    """Return a prefilled cart URL for the given ingredients.

    `ingredients` is a list of dicts with at least `name` and `unit` keys.
    """
    supabase = get_supabase_admin()
    product_ids: List[str] = []
    for ing in ingredients:
        name = ing.get("name")
        if not name:
            continue
        res = supabase.table("product_mappings").select("product_id").eq("ingredient_name", name).eq("retailer", retailer).limit(1).execute()
        if res.data:
            product_ids.append(res.data[0]["product_id"])
    if not product_ids:
        return None
    if retailer == "instacart":
        return build_instacart_url(product_ids)
    # Extend for walmart, etc.
    return None 