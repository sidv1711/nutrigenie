from typing import Optional, Tuple, Dict
import logging
from .price_sources import PriceSource

class SafewayFallbackPriceSource(PriceSource):
    """
    Fallback Safeway pricing using category-based estimates.
    Uses realistic grocery price estimates based on typical Safeway pricing.
    """

    def __init__(self):
        # Category-based price estimates (per unit) based on typical Safeway prices
        self.price_estimates = {
            # Produce (per lb unless specified)
            'apple': 1.99,
            'banana': 0.79,
            'orange': 1.49,
            'onion': 1.29,
            'potato': 1.49,
            'tomato': 2.99,
            'cucumber': 1.49,
            'carrot': 1.29,
            'bell pepper': 1.99,
            'lettuce': 2.49,
            'spinach': 3.49,
            'broccoli': 2.49,
            'garlic': 4.99,  # per lb
            
            # Dairy (per unit/container)
            'milk': 3.99,  # per gallon
            'almond milk': 4.49,  # per half-gallon
            'yogurt': 1.29,  # per container
            'cheese': 4.99,  # per package
            'butter': 4.99,  # per package
            'cream cheese': 2.49,
            
            # Proteins (per lb)
            'chicken breast': 5.99,
            'ground beef': 4.99,
            'salmon': 9.99,
            'eggs': 3.49,  # per dozen
            'tofu': 3.99,  # per package
            
            # Pantry/Dry Goods
            'rice': 2.99,  # per bag
            'pasta': 1.49,  # per box
            'bread': 2.99,  # per loaf
            'oats': 3.99,  # per container
            'flour': 3.49,  # per bag
            'sugar': 3.99,  # per bag
            'olive oil': 7.99,  # per bottle
            'vinegar': 2.99,  # per bottle
            'soy sauce': 3.49,  # per bottle
            
            # Canned/Jarred
            'canned tomatoes': 1.49,
            'beans': 1.29,  # per can
            'tuna': 1.99,  # per can
            'peanut butter': 4.99,  # per jar
            
            # Frozen
            'frozen vegetables': 2.49,  # per bag
            'frozen fruit': 3.99,  # per bag
            
            # Herbs/Spices (per package)
            'basil': 2.49,
            'parsley': 1.99,
            'cilantro': 1.99,
            'oregano': 1.99,
            'thyme': 2.49,
            'rosemary': 2.49,
        }
        
        # Unit conversion factors for price adjustment
        self.unit_conversions = {
            ('lb', 'oz'): 16,
            ('lb', 'g'): 453.592,
            ('lb', 'kg'): 0.453592,
            ('gallon', 'cup'): 16,
            ('gallon', 'ml'): 3785.41,
            ('gallon', 'l'): 3.78541,
            ('each', 'slice'): 8,  # 8 slices per item
            ('each', 'clove'): 12,  # 12 cloves per bulb
            ('dozen', 'each'): 12,
        }
        
    @property 
    def source_name(self) -> str:
        return "safeway_fallback"

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Return estimated price based on ingredient category and realistic Safeway pricing.
        """
        try:
            ingredient_lower = ingredient_name.lower().strip()
            
            # Direct match
            if ingredient_lower in self.price_estimates:
                base_price = self.price_estimates[ingredient_lower]
                return (base_price, unit)
            
            # Partial match - find best matching ingredient
            best_match = None
            best_score = 0
            
            for key in self.price_estimates.keys():
                score = self._calculate_similarity(ingredient_lower, key)
                if score > best_score and score > 0.3:  # Minimum similarity threshold
                    best_score = score
                    best_match = key
            
            if best_match:
                base_price = self.price_estimates[best_match]
                logging.getLogger(__name__).info(f"Safeway fallback: matched '{ingredient_name}' to '{best_match}' (${base_price})")
                return (base_price, unit)
            
            # Category-based fallback
            category_price = self._get_category_price(ingredient_lower)
            if category_price:
                logging.getLogger(__name__).info(f"Safeway fallback: category pricing for '{ingredient_name}' (${category_price})")
                return (category_price, unit)
            
            # Default fallback
            default_price = 2.99
            logging.getLogger(__name__).info(f"Safeway fallback: default pricing for '{ingredient_name}' (${default_price})")
            return (default_price, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway fallback pricing failed for {ingredient_name}: {e}")
            return (2.99, unit)  # Safe default
    
    def _calculate_similarity(self, ingredient: str, key: str) -> float:
        """Calculate similarity score between ingredient and known item."""
        ingredient_words = set(ingredient.split())
        key_words = set(key.split())
        
        # Exact match
        if ingredient == key:
            return 1.0
        
        # Word overlap
        if ingredient_words & key_words:
            overlap = len(ingredient_words & key_words)
            total = len(ingredient_words | key_words)
            return overlap / total
        
        # Substring match
        if ingredient in key or key in ingredient:
            return 0.5
        
        return 0.0
    
    def _get_category_price(self, ingredient: str) -> Optional[float]:
        """Get price based on ingredient category."""
        
        # Produce keywords
        produce_keywords = ['fresh', 'organic', 'vegetable', 'fruit']
        if any(keyword in ingredient for keyword in produce_keywords):
            return 2.49  # Average produce price
        
        # Meat keywords  
        meat_keywords = ['chicken', 'beef', 'pork', 'turkey', 'meat', 'fish']
        if any(keyword in ingredient for keyword in meat_keywords):
            return 6.99  # Average meat price per lb
        
        # Dairy keywords
        dairy_keywords = ['milk', 'cheese', 'yogurt', 'cream', 'dairy']
        if any(keyword in ingredient for keyword in dairy_keywords):
            return 3.99  # Average dairy price
        
        # Pantry keywords
        pantry_keywords = ['flour', 'sugar', 'rice', 'pasta', 'oil', 'spice', 'sauce']
        if any(keyword in ingredient for keyword in pantry_keywords):
            return 3.49  # Average pantry item price
        
        # Canned keywords
        canned_keywords = ['canned', 'jarred', 'jar', 'can']
        if any(keyword in ingredient for keyword in canned_keywords):
            return 1.99  # Average canned goods price
        
        return None

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """Return default store ID for fallback pricing."""
        return "3132"  # Default Bay Area Safeway

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Async version of fetch_price."""
        return self.fetch_price(store_external_id, ingredient_name, unit)