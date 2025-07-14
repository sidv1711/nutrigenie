from typing import List
from ..core.supabase import get_supabase_admin
from .unit_conversion import convert_price, normalize

def get_price_per_unit(place_ids: List[str], ingredient_name: str, unit: str, default: float = 1.0) -> float:
    """Return the cheapest price per unit among given stores; fallback to default."""
    supabase = get_supabase_admin()
    try:
        query = supabase.table("stores_prices") \
            .select("price_per_unit, unit") \
            .ilike("ingredient_name", ingredient_name)

        if place_ids:
            query = query.in_("place_id", place_ids)

        res = query.order("price_per_unit", ascending=True).limit(20).execute()

        for row in (res.data or []):
            price = float(row["price_per_unit"])
            price_unit = row["unit"]
            if normalize(price_unit) == normalize(unit):
                return price  # exact match
            converted = convert_price(price, price_unit, unit)
            if converted is not None:
                return converted
    except Exception:
        pass
    return default 