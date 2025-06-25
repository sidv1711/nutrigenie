from typing import List
from ..core.supabase import get_supabase_admin

def get_price_per_unit(place_ids: List[str], ingredient_name: str, unit: str, default: float = 1.0) -> float:
    """Return the cheapest price per unit among given stores; fallback to default."""
    if not place_ids:
        return default
    supabase = get_supabase_admin()
    try:
        res = supabase.table("stores_prices") \
            .select("price_per_unit") \
            .in_("place_id", place_ids) \
            .eq("unit", unit) \
            .ilike("ingredient_name", ingredient_name) \
            .order("price_per_unit", ascending=True) \
            .limit(1).execute()
        if res.data:
            return float(res.data[0]["price_per_unit"])
    except Exception:
        pass
    return default 