"""
Store-specific price adjustments when we don't have direct pricing data.
Uses research-based price differentials between stores to estimate costs.
"""

from typing import Dict, Optional
from .price_research import get_research_based_multiplier

# Additional store mappings not covered in research data
ADDITIONAL_STORE_MULTIPLIERS = {
    # Convenience (Higher prices)
    "cvs": 1.40,
    "walgreens": 1.38,
    "7-eleven": 1.50,
    "wawa": 1.35,
    
    # Regional discount chains
    "food 4 less": 0.80,
    "winco": 0.78,
    "h-e-b": 0.95,
    "meijer": 0.98,
    
    # Warehouse/Bulk (additional)
    "bj's": 0.92,
    "united supermarkets": 1.02,
}

def get_store_price_multiplier(store_name: str) -> float:
    """
    Get price multiplier for a store based on research data and typical pricing.
    Returns 1.0 if store not found (no adjustment).
    """
    if not store_name:
        return 1.0
        
    # First try research-based multipliers (Consumer Reports + Market Sampling)
    research_multiplier = get_research_based_multiplier(store_name, "combined")
    if research_multiplier != 1.0:  # Found in research data
        return research_multiplier
    
    # Fall back to additional store mappings
    store_lower = store_name.lower()
    
    # Direct match in additional stores
    if store_lower in ADDITIONAL_STORE_MULTIPLIERS:
        return ADDITIONAL_STORE_MULTIPLIERS[store_lower]
    
    # Partial matching for store chains
    for store_key, multiplier in ADDITIONAL_STORE_MULTIPLIERS.items():
        if store_key in store_lower or store_lower in store_key:
            return multiplier
    
    # Default: no adjustment
    return 1.0

def adjust_price_for_store(base_price: float, store_name: str) -> float:
    """
    Adjust a base price for a specific store's typical pricing.
    
    Args:
        base_price: Price from our baseline sources (Kroger/Safeway)
        store_name: Name of the store user selected
        
    Returns:
        Adjusted price estimate for that store
    """
    multiplier = get_store_price_multiplier(store_name)
    return base_price * multiplier

def get_store_coverage_info(place_ids: list) -> Dict[str, bool]:
    """
    Check which stores we have direct price data for.
    
    Returns:
        Dict mapping place_id to whether we have price data
    """
    from ..core.supabase import get_supabase_admin
    
    if not place_ids:
        return {}
    
    supabase = get_supabase_admin()
    
    # Get stores with price data
    price_result = supabase.table("stores_prices").select("place_id").in_("place_id", place_ids).execute()
    stores_with_prices = set(row["place_id"] for row in (price_result.data or []))
    
    # Return coverage info
    return {place_id: place_id in stores_with_prices for place_id in place_ids}

# Example usage:
"""
# Check if user's selected stores have price data
coverage = get_store_coverage_info(["ChIJ123_whole_foods", "ChIJ456_kroger"])
# Result: {"ChIJ123_whole_foods": False, "ChIJ456_kroger": True}

# Adjust pricing for unsupported stores
base_price = 3.99  # From Kroger/Safeway
whole_foods_price = adjust_price_for_store(base_price, "Whole Foods Market")
# Result: 3.99 * 1.35 = 5.39 (more realistic Whole Foods pricing)
"""