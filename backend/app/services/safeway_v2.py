import re
import json
from typing import Optional, Tuple, Dict, List
import httpx
import logging
import time
from urllib.parse import quote

from .price_sources import PriceSource

class SafewayPriceSourceV2(PriceSource):
    """Modern Safeway scraper using updated API endpoints discovered from their current website."""

    def __init__(self):
        self._session = None
        self._store_cache = {}
        
    @property
    def source_name(self) -> str:
        return "safeway_web_v2"

    def _get_session(self) -> httpx.Client:
        """Get or create HTTP session with appropriate headers for modern Safeway API."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.safeway.com/",
                    "Origin": "https://www.safeway.com",
                    "X-Requested-With": "XMLHttpRequest",
                    # Required subscription key from their public website
                    "ocp-apim-subscription-key": "7bad9afbb87043b28519c4443106db06"
                },
                timeout=20
            )
        return self._session

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price from Safeway using their modern search API.
        """
        try:
            session = self._get_session()
            
            # Use modern product search API discovered from website
            search_term = quote(ingredient_name)
            
            # Modern search endpoint
            search_url = "https://www.safeway.com/abs/pub/xapi/search/products"
            
            params = {
                'storeId': store_external_id,
                'q': search_term,
                'rows': '10',
                'start': '0',
                'sort': 'relevance'
            }
            
            response = session.get(search_url, params=params)
            
            if response.status_code != 200:
                logging.getLogger(__name__).warning(f"Safeway search API returned {response.status_code}")
                return (None, unit)
            
            try:
                data = response.json()
            except json.JSONDecodeError:
                logging.getLogger(__name__).warning("Failed to parse Safeway API JSON response")
                return (None, unit)
            
            # Extract products from modern API response
            products = self._extract_products_from_search_api(data)
            
            if products:
                # Find best matching product
                best_match = self._find_best_match(products, ingredient_name)
                if best_match:
                    price = self._extract_price_from_modern_product(best_match)
                    if price:
                        # Extract unit information
                        detected_unit = self._extract_unit_from_modern_product(best_match) or unit
                        return (float(price), detected_unit)
            
            return (None, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway V2 price lookup failed for {ingredient_name}: {e}")
            return (None, unit)

    def _extract_products_from_search_api(self, data: Dict) -> List[Dict]:
        """Extract products from modern Safeway search API response."""
        try:
            # Common response structures for modern APIs
            if 'products' in data:
                return data['products']
            elif 'results' in data and 'products' in data['results']:
                return data['results']['products']
            elif 'response' in data and 'docs' in data['response']:
                return data['response']['docs']
            elif 'data' in data and isinstance(data['data'], list):
                return data['data']
            elif isinstance(data, list):
                return data
            return []
        except:
            return []

    def _find_best_match(self, products: List[Dict], ingredient_name: str) -> Optional[Dict]:
        """Find the best matching product for the ingredient."""
        if not products:
            return None
            
        ingredient_lower = ingredient_name.lower()
        best_score = 0
        best_product = None
        
        for product in products:
            # Try different name fields
            product_name = ""
            for name_field in ['name', 'title', 'productName', 'description', 'brand']:
                if name_field in product and product[name_field]:
                    product_name = str(product[name_field]).lower()
                    break
            
            if not product_name:
                continue
            
            # Calculate similarity score
            score = 0
            if ingredient_lower in product_name:
                score += 3
            if product_name in ingredient_lower:
                score += 2
                
            # Check for individual words
            ingredient_words = ingredient_lower.split()
            for word in ingredient_words:
                if len(word) > 2 and word in product_name:
                    score += 1
                    
            if score > best_score:
                best_score = score
                best_product = product
                
        return best_product if best_score > 0 else (products[0] if products else None)

    def _extract_price_from_modern_product(self, product: Dict) -> Optional[float]:
        """Extract price from modern product data structure."""
        try:
            # Try various price field names used in modern APIs
            price_fields = [
                'price', 'regularPrice', 'currentPrice', 'basePrice',
                'displayPrice', 'retailPrice', 'unitPrice', 'salePrice',
                'pricePerUnit', 'cost'
            ]
            
            for field in price_fields:
                price = product.get(field)
                if price is not None:
                    if isinstance(price, dict):
                        # Handle nested price objects like {"value": 2.99, "currency": "USD"}
                        if 'value' in price:
                            return float(price['value'])
                        elif 'amount' in price:
                            return float(price['amount'])
                    elif isinstance(price, str):
                        # Remove currency symbols and convert
                        price_str = re.sub(r'[^\d.]', '', price)
                        if price_str:
                            return float(price_str)
                    elif isinstance(price, (int, float)):
                        return float(price)
            
            # Try to extract from nested structures
            if 'pricing' in product:
                pricing = product['pricing']
                if isinstance(pricing, dict):
                    for field in price_fields:
                        if field in pricing:
                            price = pricing[field]
                            if isinstance(price, (int, float)):
                                return float(price)
            
            return None
        except:
            return None

    def _extract_unit_from_modern_product(self, product: Dict) -> Optional[str]:
        """Extract unit information from modern product data."""
        try:
            # Look for unit information in various fields
            unit_fields = ['unit', 'uom', 'unitOfMeasure', 'size', 'packageSize', 'sellUnit']
            
            for field in unit_fields:
                unit_info = product.get(field)
                if unit_info:
                    return str(unit_info).lower()
            
            # Try nested unit info
            if 'unitInfo' in product:
                unit_info = product['unitInfo']
                if isinstance(unit_info, dict):
                    for field in ['unit', 'uom', 'type']:
                        if field in unit_info:
                            return str(unit_info[field]).lower()
                elif isinstance(unit_info, str):
                    return unit_info.lower()
                    
            # Try to extract from product name or description
            name_or_desc = f"{product.get('name', '')} {product.get('description', '')}"
            
            # Look for common unit patterns
            unit_patterns = [
                r'(\d+)\s*(oz|lb|lbs|g|kg|ml|l|ct|count|each)',
                r'(\d+)\s*(fl\s*oz|fluid\s*ounce)',
            ]
            
            for pattern in unit_patterns:
                match = re.search(pattern, name_or_desc, re.IGNORECASE)
                if match:
                    return match.group(2).lower()
                    
            return None
        except:
            return None

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """
        Find nearest Safeway store ID using modern store resolver API.
        """
        try:
            session = self._get_session()
            
            # Use modern store resolver API
            store_url = "https://www.safeway.com/abs/pub/xapi/storeresolver/v2/storesByAddress"
            
            params = {
                'address': f"{latitude},{longitude}",
                'radius': radius_miles,
                'limit': 1,
                'banner': 'safeway'
            }
            
            response = session.get(store_url, params=params)
            
            if response.status_code != 200:
                logging.getLogger(__name__).warning(f"Safeway store lookup returned {response.status_code}")
                return None
                
            data = response.json()
            
            # Extract store ID from modern API response
            if 'stores' in data and data['stores']:
                store = data['stores'][0]
                store_id = str(store.get('storeId') or store.get('id') or store.get('storeNumber'))
                if store_id and store_id != 'None':
                    return store_id
            elif 'data' in data and data['data']:
                store = data['data'][0]
                store_id = str(store.get('storeId') or store.get('id') or store.get('storeNumber'))
                if store_id and store_id != 'None':
                    return store_id
            
            return None
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway V2 store lookup failed: {e}")
            return None

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Async version of fetch_price for compatibility with scraping framework."""
        return self.fetch_price(store_external_id, ingredient_name, unit)