import re
import json
from typing import Optional, Tuple, Dict
import httpx
import logging
import time
from urllib.parse import quote

from .price_sources import PriceSource

class InstacartPriceSource(PriceSource):
    """
    Scrapes Instacart for prices from multiple retailers including:
    - Whole Foods
    - Safeway  
    - Costco
    - And many others
    """

    def __init__(self, retailer_name: str = "whole_foods"):
        """
        Initialize with specific retailer.
        retailer_name options: whole_foods, safeway, costco, etc.
        """
        self.retailer_name = retailer_name
        self._session = None
        
    @property
    def source_name(self) -> str:
        return f"instacart_{self.retailer_name}"

    def _get_session(self) -> httpx.Client:
        """Get or create HTTP session with appropriate headers."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.instacart.com/",
                    "Origin": "https://www.instacart.com"
                },
                timeout=20
            )
        return self._session

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price from Instacart for specific retailer.
        store_external_id should be the Instacart store/zone ID.
        """
        try:
            session = self._get_session()
            
            # First, set location context if needed
            # This may require additional API calls to set delivery address
            
            # Search for the product
            search_term = quote(ingredient_name)
            search_url = f"https://www.instacart.com/v3/containers/retail_search_results_page"
            
            # This is a simplified version - Instacart's actual API is more complex
            # and requires authentication, location setting, etc.
            params = {
                'source': 'search_suggestions',
                'term': search_term,
                'page': '1'
            }
            
            response = session.get(search_url, params=params)
            
            if response.status_code != 200:
                return (None, unit)
                
            # Parse JSON response to extract price information
            # This would need to be adapted based on Instacart's actual API structure
            data = response.json()
            
            # Look for products in the response
            products = self._extract_products(data)
            
            if products:
                # Find best matching product and extract price
                best_match = self._find_best_match(products, ingredient_name)
                if best_match:
                    price = self._extract_price(best_match)
                    if price:
                        return (float(price), unit)
            
            return (None, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Instacart {self.retailer_name} price lookup failed for {ingredient_name}: {e}")
            return (None, unit)

    def _extract_products(self, data: Dict) -> list:
        """Extract product list from Instacart API response."""
        try:
            # This structure would need to be determined by analyzing actual API responses
            return data.get('modules', [{}])[0].get('data', {}).get('items', [])
        except:
            return []

    def _find_best_match(self, products: list, ingredient_name: str) -> Optional[Dict]:
        """Find the best matching product for the ingredient."""
        if not products:
            return None
            
        # Simple matching - could be improved with fuzzy matching
        ingredient_lower = ingredient_name.lower()
        for product in products:
            product_name = product.get('name', '').lower()
            if ingredient_lower in product_name or product_name in ingredient_lower:
                return product
                
        # If no good match, return first product
        return products[0] if products else None

    def _extract_price(self, product: Dict) -> Optional[float]:
        """Extract price from product data."""
        try:
            # Price structure would depend on Instacart's API format
            pricing = product.get('pricing', {})
            price = pricing.get('price', {}).get('amount')
            if price:
                return float(price) / 100  # Convert cents to dollars
            return None
        except:
            return None

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """
        Find Instacart delivery zone ID for the given coordinates and retailer.
        """
        try:
            session = self._get_session()
            
            # Use Instacart's address/location API to find delivery zones
            location_url = "https://www.instacart.com/v3/address_autocompletes"
            params = {
                'address': f"{latitude},{longitude}",
                'source': 'geolocation'
            }
            
            response = session.get(location_url, params=params)
            if response.status_code != 200:
                return None
                
            data = response.json()
            
            # Extract zone/store ID for the specific retailer
            # This would require understanding Instacart's location/retailer mapping
            zones = data.get('zones', [])
            for zone in zones:
                retailers = zone.get('retailers', [])
                for retailer in retailers:
                    if retailer.get('name', '').lower().replace(' ', '_') == self.retailer_name:
                        return str(zone.get('id'))
            
            return None
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Instacart {self.retailer_name} store lookup failed: {e}")
            return None


# Convenience classes for specific retailers
class InstacartWholeFoodsSource(InstacartPriceSource):
    def __init__(self):
        super().__init__("whole_foods")

class InstacartSafewaySource(InstacartPriceSource):
    def __init__(self):
        super().__init__("safeway")

class InstacartCostcoSource(InstacartPriceSource):
    def __init__(self):
        super().__init__("costco")