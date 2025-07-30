from typing import List
from ..core.supabase import get_supabase_admin
from .unit_conversion import convert_price, normalize
from .store_adjustments import adjust_price_for_store

def is_realistic_price(price: float, ingredient_name: str, unit: str) -> bool:
    """Check if a price seems realistic vs obviously wrong."""
    if price <= 0:
        return False
    
    # Reject uniform prices that indicate scraping errors
    # These are common values returned by broken scrapers
    suspicious_uniform_prices = [5.0, 1.0, 10.0, 3.0]
    if any(abs(price - uniform_price) < 0.01 for uniform_price in suspicious_uniform_prices):
        # Allow these prices only for expensive or large items
        expensive_keywords = ['meat', 'beef', 'salmon', 'tuna', 'cheese', 'nuts', 'oil', 'organic']
        large_keywords = ['bottle', 'jar', 'bag', 'package', 'box', 'container']
        
        ingredient_lower = ingredient_name.lower()
        if not any(keyword in ingredient_lower for keyword in expensive_keywords + large_keywords):
            return False
    
    # More aggressive thresholds to catch scraping errors
    if unit in ['each', 'piece', 'item', 'ct', 'count']:
        # Individual items - most grocery items shouldn't exceed $3 each
        # Exceptions for expensive categories
        expensive_keywords = ['meat', 'fish', 'cheese', 'nuts', 'oil', 'organic', 'premium']
        max_price = 6.0 if any(kw in ingredient_name.lower() for kw in expensive_keywords) else 3.0
        return price <= max_price
        
    elif unit in ['lb', 'kg']:
        # Per pound/kg - most items shouldn't exceed $8/lb
        return price <= 8.0
        
    elif unit in ['g', 'oz']:
        # Per gram/ounce - very expensive per small unit is suspicious
        return price <= 0.50  # $0.50 per gram/oz max
        
    elif unit in ['ml', 'fl-oz']:
        # Per ml/fl-oz - liquids shouldn't be too expensive per small volume
        return price <= 0.02  # $0.02 per ml max
        
    elif unit in ['l', 'cup']:
        # Per liter/cup - reasonable for liquid volumes
        return price <= 5.0
        
    elif unit in ['slice', 'slices', 'wedge', 'wedges']:
        # Per slice - bread, pizza, etc. shouldn't be too expensive per slice
        return price <= 1.0
        
    elif unit in ['clove', 'cloves', 'sprig', 'sprigs', 'leaf', 'leaves']:
        # Small units - herbs, garlic, etc.
        return price <= 0.25
        
    else:
        # Other units - conservative general check
        return price <= 5.0

def get_price_per_unit(place_ids: List[str], ingredient_name: str, unit: str, default: float = 1.0) -> float:
    """Return the cheapest REALISTIC price per unit among given stores; fallback to default."""
    supabase = get_supabase_admin()
    
    # Check if we have price data for the requested stores
    if place_ids:
        coverage_result = supabase.table("stores_prices").select("place_id").in_("place_id", place_ids).limit(1).execute()
        has_store_coverage = len(coverage_result.data or []) > 0
        
        if not has_store_coverage:
            print(f"Warning: No price data available for selected stores. Using fallback pricing for {ingredient_name}")
    
    try:
        # Try multiple ingredient name variations for better matching
        name_variations = [
            ingredient_name,
            ingredient_name.lower(),
            ingredient_name.lower().replace(',', '').strip(),
            ingredient_name.title(),
        ]
        
        best_price = None
        realistic_prices = []  # Track realistic prices separately
        
        for name_variant in name_variations:
            query = supabase.table("stores_prices") \
                .select("price_per_unit, unit, ingredient_name") \
                .ilike("ingredient_name", f"%{name_variant}%")

            if place_ids:
                query = query.in_("place_id", place_ids)

            res = query.order("price_per_unit").limit(20).execute()

            for row in (res.data or []):
                try:
                    price = float(row["price_per_unit"])
                    price_unit = row["unit"]
                    
                    # Check for exact unit match first
                    if normalize(price_unit) == normalize(unit):
                        if is_realistic_price(price, ingredient_name, unit):
                            realistic_prices.append(price)
                            if best_price is None or price < best_price:
                                best_price = price
                        continue
                    
                    # Try unit conversion
                    converted = convert_price(price, price_unit, unit)
                    if converted is not None:
                        if is_realistic_price(converted, ingredient_name, unit):
                            realistic_prices.append(converted)
                            if best_price is None or converted < best_price:
                                best_price = converted
                except (ValueError, TypeError):
                    continue
            
            # If we found realistic prices with this name variant, return the best one
            if realistic_prices:
                return min(realistic_prices)
        
        # If no store-specific realistic prices found, try global cheapest with store adjustment
        if place_ids:  # Only try this if we originally filtered by store
            global_price = get_price_per_unit([], ingredient_name, unit, default)
            # Only use global price if it's realistic
            if is_realistic_price(global_price, ingredient_name, unit):
                # Adjust price based on research-based store characteristics
                adjusted_price = adjust_price_for_stores(global_price, place_ids)
                return adjusted_price
            
    except Exception as e:
        # For debugging - you can remove this in production
        print(f"Error in get_price_per_unit for '{ingredient_name}' ({unit}): {e}")
        pass
    
    return default

def adjust_price_for_stores(base_price: float, place_ids: List[str]) -> float:
    """Adjust base price based on the stores selected by user."""
    try:
        from ..core.supabase import get_supabase_admin
        supabase = get_supabase_admin()
        
        # Get store names for the place_ids
        stores_result = supabase.table("stores").select("name").in_("place_id", place_ids).execute()
        
        if not stores_result.data:
            return base_price
        
        # Use the first store's multiplier (could be enhanced to average multiple stores)
        store_name = stores_result.data[0].get("name", "")
        adjusted_price = adjust_price_for_store(base_price, store_name)
        
        return adjusted_price
        
    except Exception as e:
        print(f"Error adjusting price for stores: {e}")
        return base_price 