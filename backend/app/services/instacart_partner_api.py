"""
Instacart Partner API integration for accessing real-time pricing data.
Requires approval from Instacart Developer Platform (IDP Partner API).
"""

from typing import Optional, Tuple, Dict, List, Any
import httpx
import logging
import json
from datetime import datetime, timedelta
import asyncio

from .price_sources import PriceSource

class InstacartPartnerAPI(PriceSource):
    """
    Instacart Partner API integration for multi-store pricing data.
    Provides access to 85,000+ stores across 1,500+ retail banners.
    """

    def __init__(self, api_key: str = None, partner_id: str = None):
        self.api_key = api_key or self._get_api_key_from_env()
        self.partner_id = partner_id
        self.base_url = "https://api.instacart.com/v2"  # Placeholder - actual URL TBD
        self._session = None
        self._store_cache = {}
        self._product_cache = {}
        
    @property
    def source_name(self) -> str:
        return "instacart_partner_api"

    def _get_api_key_from_env(self) -> Optional[str]:
        """Get API key from environment variables."""
        import os
        return os.getenv("INSTACART_API_KEY")

    def _get_session(self) -> httpx.Client:
        """Get or create HTTP session with authentication."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "NutriGenie-MealPlan/1.0",
                },
                timeout=30
            )
        return self._session

    # Store Management Methods
    
    def find_stores_by_location(self, latitude: float, longitude: float, 
                               radius_miles: int = 10, retailer: str = None) -> List[Dict[str, Any]]:
        """
        Find Instacart partner stores near a location.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude  
            radius_miles: Search radius in miles
            retailer: Optional retailer filter (e.g., "safeway", "kroger")
        
        Returns:
            List of store dictionaries with id, name, retailer, address, etc.
        """
        try:
            session = self._get_session()
            
            params = {
                "lat": latitude,
                "lng": longitude, 
                "radius": radius_miles,
            }
            
            if retailer:
                params["retailer"] = retailer
                
            response = session.get(f"{self.base_url}/stores/search", params=params)
            response.raise_for_status()
            
            stores_data = response.json()
            
            # Cache stores for later use
            for store in stores_data.get("stores", []):
                self._store_cache[store["id"]] = store
                
            return stores_data.get("stores", [])
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart store search failed: {e}")
            return []

    def get_store_details(self, store_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific store."""
        if store_id in self._store_cache:
            return self._store_cache[store_id]
            
        try:
            session = self._get_session()
            response = session.get(f"{self.base_url}/stores/{store_id}")
            response.raise_for_status()
            
            store_data = response.json()
            self._store_cache[store_id] = store_data
            return store_data
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart store details failed for {store_id}: {e}")
            return None

    # Product Search & Pricing Methods
    
    def search_products(self, query: str, store_id: str = None, 
                       category: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for products across Instacart catalog.
        
        Args:
            query: Search term (e.g., "organic milk")
            store_id: Optional store filter
            category: Optional category filter (e.g., "dairy", "produce")
            limit: Maximum results to return
            
        Returns:
            List of product dictionaries with pricing, availability, etc.
        """
        try:
            session = self._get_session()
            
            params = {
                "q": query,
                "limit": limit
            }
            
            if store_id:
                params["store_id"] = store_id
            if category:
                params["category"] = category
                
            response = session.get(f"{self.base_url}/catalog/search", params=params)
            response.raise_for_status()
            
            products_data = response.json()
            products = products_data.get("products", [])
            
            # Cache products
            for product in products:
                cache_key = f"{product.get('id', '')}_{store_id or 'global'}"
                self._product_cache[cache_key] = product
                
            return products
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart product search failed for '{query}': {e}")
            return []

    def get_product_price(self, product_id: str, store_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current pricing for a specific product at a specific store.
        
        Returns:
            Dict with price, unit, availability, discounts, etc.
        """
        try:
            session = self._get_session()
            
            params = {"store_id": store_id}
            response = session.get(f"{self.base_url}/catalog/products/{product_id}", params=params)
            response.raise_for_status()
            
            product_data = response.json()
            return {
                "price": product_data.get("price"),
                "unit": product_data.get("unit"),
                "unit_price": product_data.get("unit_price"), 
                "sale_price": product_data.get("sale_price"),
                "availability": product_data.get("in_stock", True),
                "product_name": product_data.get("name"),
                "brand": product_data.get("brand"),
                "size": product_data.get("size")
            }
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart price lookup failed for product {product_id}: {e}")
            return None

    # PriceSource Interface Implementation
    
    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price for an ingredient from Instacart.
        
        Args:
            store_external_id: Instacart store ID
            ingredient_name: Ingredient to search for
            unit: Desired unit (will try to convert if needed)
            
        Returns:
            Tuple of (price_per_unit, actual_unit)
        """
        try:
            # Search for products matching the ingredient
            products = self.search_products(ingredient_name, store_external_id, limit=5)
            
            if not products:
                return (None, unit)
            
            # Find best matching product
            best_product = self._find_best_product_match(products, ingredient_name)
            
            if not best_product:
                return (None, unit)
            
            # Get detailed pricing information  
            price_info = self.get_product_price(best_product["id"], store_external_id)
            
            if not price_info or not price_info.get("price"):
                return (None, unit)
            
            # Use unit_price if available (price per standard unit)
            price = price_info.get("unit_price") or price_info.get("price")
            actual_unit = price_info.get("unit") or unit
            
            return (float(price), actual_unit)
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart fetch_price failed for {ingredient_name}: {e}")
            return (None, unit)

    def _find_best_product_match(self, products: List[Dict], ingredient_name: str) -> Optional[Dict]:
        """Find the product that best matches the ingredient name."""
        if not products:
            return None
            
        ingredient_lower = ingredient_name.lower()
        best_score = 0
        best_product = None
        
        for product in products:
            product_name = (product.get("name") or "").lower()
            brand = (product.get("brand") or "").lower()
            full_name = f"{brand} {product_name}".strip()
            
            # Calculate match score
            score = 0
            
            # Exact match
            if ingredient_lower == product_name:
                score += 10
            elif ingredient_lower in product_name:
                score += 5
            elif product_name in ingredient_lower:
                score += 3
                
            # Word overlap
            ingredient_words = set(ingredient_lower.split())
            product_words = set(product_name.split())
            overlap = len(ingredient_words & product_words)
            score += overlap * 2
            
            # Prefer products with availability
            if product.get("in_stock", True):
                score += 1
                
            if score > best_score:
                best_score = score
                best_product = product
                
        return best_product if best_score > 0 else products[0]

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """Find the nearest Instacart store ID."""
        stores = self.find_stores_by_location(latitude, longitude, radius_miles)
        return stores[0]["id"] if stores else None

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Async version of fetch_price."""
        # For now, run sync version in thread pool
        # TODO: Implement proper async HTTP calls
        return self.fetch_price(store_external_id, ingredient_name, unit)

    # Utility Methods
    
    def get_supported_retailers(self) -> List[str]:
        """Get list of supported retailer names."""
        # This would come from the API once we have access
        return [
            "safeway", "kroger", "costco", "trader-joes", "whole-foods",
            "target", "cvs", "walgreens", "petco", "sephora"
        ]

    def get_categories(self) -> List[str]:
        """Get available product categories."""
        return [
            "produce", "dairy", "meat", "seafood", "bakery", "deli",
            "frozen", "pantry", "beverages", "health", "beauty", "pet"
        ]

    def close(self):
        """Close HTTP session."""
        if self._session:
            self._session.close()
            self._session = None

# Example usage (once API access is approved):
"""
# Initialize with API credentials
instacart = InstacartPartnerAPI(api_key="your_api_key")

# Find stores near location  
stores = instacart.find_stores_by_location(37.7749, -122.4194, retailer="safeway")

# Search for products
products = instacart.search_products("organic milk", store_id=stores[0]["id"])

# Get pricing
price, unit = instacart.fetch_price(stores[0]["id"], "milk", "gallon")
print(f"Milk costs ${price} per {unit}")

# Use in price scraping pipeline
SOURCES = [
    KrogerPriceSource(),
    InstacartPartnerAPI(),  # Multi-store access
    SafewayFallbackPriceSource()  # Fallback
]
"""