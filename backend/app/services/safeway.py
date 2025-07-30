import re
import json
from typing import Optional, Tuple, Dict, List
import httpx
import logging
import time
from urllib.parse import quote

from .price_sources import PriceSource

class SafewayPriceSource(PriceSource):
    """Scrapes Safeway/Albertsons family stores for price information using their API."""

    def __init__(self):
        self._session = None
        
    @property
    def source_name(self) -> str:
        return "safeway_web"

    def _get_session(self) -> httpx.Client:
        """Get or create HTTP session with appropriate headers."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.safeway.com/",
                    "Origin": "https://www.safeway.com"
                },
                timeout=20
            )
        return self._session

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price from Safeway using their search API.
        store_external_id should be the Safeway store ID.
        """
        try:
            session = self._get_session()
            
            # Use Safeway's product search API
            search_term = quote(ingredient_name)
            
            # Safeway uses an internal API for product search
            api_url = "https://www.safeway.com/abs/pub/web/j4u/api/products/search"
            
            params = {
                'storeId': store_external_id,
                'query': search_term,
                'rows': '10',
                'start': '0',
                'url': '/shop/search-results.html'
            }
            
            # Add store context headers
            session.headers.update({
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            })
            
            response = session.get(api_url, params=params)
            
            if response.status_code != 200:
                # Try alternative search endpoint
                return self._try_alternative_search(session, store_external_id, ingredient_name, unit)
                
            data = response.json()
            
            # Extract product information
            products = self._extract_products_from_api(data)
            
            if products:
                # Find best matching product
                best_match = self._find_best_match(products, ingredient_name)
                if best_match:
                    price = self._extract_price_from_product(best_match)
                    if price:
                        # Try to extract unit information
                        detected_unit = self._extract_unit_from_product(best_match) or unit
                        return (float(price), detected_unit)
            
            return (None, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway API price lookup failed for {ingredient_name}: {e}")
            return (None, unit)

    def _try_alternative_search(self, session: httpx.Client, store_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Try alternative search method using the main search page."""
        try:
            search_term = ingredient_name.replace(' ', '+')
            url = f"https://www.safeway.com/shop/search-results.html?q={search_term}"
            
            response = session.get(url)
            if response.status_code != 200:
                return (None, unit)
            
            # Look for JSON product data in the HTML
            html_content = response.text
            
            # Search for product data in script tags
            json_pattern = r'window\.__INITIAL_STATE__\s*=\s*({.*?});'
            match = re.search(json_pattern, html_content, re.DOTALL)
            
            if match:
                try:
                    data = json.loads(match.group(1))
                    products = self._extract_products_from_html_json(data)
                    
                    if products:
                        best_match = self._find_best_match(products, ingredient_name)
                        if best_match:
                            price = self._extract_price_from_product(best_match)
                            if price:
                                return (float(price), unit)
                except json.JSONDecodeError:
                    pass
            
            # Fallback: look for price patterns in HTML
            price_patterns = [
                r'\$(\d+\.?\d*)',
                r'price["\']:\s*["\']?\$?(\d+\.?\d*)',
                r'regularPrice["\']:\s*(\d+\.?\d*)'
            ]
            
            for pattern in price_patterns:
                prices = re.findall(pattern, html_content)
                if prices:
                    return (float(prices[0]), unit)
            
            return (None, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway alternative search failed for {ingredient_name}: {e}")
            return (None, unit)

    def _extract_products_from_api(self, data: Dict) -> List[Dict]:
        """Extract products from Safeway API response."""
        try:
            if 'response' in data and 'docs' in data['response']:
                return data['response']['docs']
            return []
        except:
            return []

    def _extract_products_from_html_json(self, data: Dict) -> List[Dict]:
        """Extract products from HTML embedded JSON."""
        try:
            # This structure may vary - adjust based on actual Safeway response structure
            products = []
            if 'search' in data and 'products' in data['search']:
                products = data['search']['products']
            return products
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
            product_name = str(product.get('name', '') or product.get('title', '')).lower()
            
            # Calculate similarity score
            score = 0
            if ingredient_lower in product_name:
                score += 3
            if product_name in ingredient_lower:
                score += 2
                
            # Check for individual words
            ingredient_words = ingredient_lower.split()
            for word in ingredient_words:
                if word in product_name:
                    score += 1
                    
            if score > best_score:
                best_score = score
                best_product = product
                
        return best_product if best_score > 0 else (products[0] if products else None)

    def _extract_price_from_product(self, product: Dict) -> Optional[float]:
        """Extract price from product data."""
        try:
            # Try various price field names
            price_fields = [
                'price', 'regularPrice', 'currentPrice', 'basePrice',
                'priceNumeric', 'displayPrice', 'retailPrice'
            ]
            
            for field in price_fields:
                price = product.get(field)
                if price is not None:
                    if isinstance(price, str):
                        # Remove currency symbols and convert
                        price_str = re.sub(r'[^\d.]', '', price)
                        if price_str:
                            return float(price_str)
                    elif isinstance(price, (int, float)):
                        return float(price)
            
            return None
        except:
            return None

    def _extract_unit_from_product(self, product: Dict) -> Optional[str]:
        """Extract unit information from product data."""
        try:
            # Look for unit information in various fields
            unit_fields = ['unit', 'uom', 'unitOfMeasure', 'size', 'packageSize']
            
            for field in unit_fields:
                unit_info = product.get(field)
                if unit_info:
                    return str(unit_info).lower()
                    
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
        Find nearest Safeway store ID based on coordinates.
        """
        try:
            session = self._get_session()
            
            # Use Safeway's store locator API
            locator_url = "https://www.safeway.com/abs/pub/web/store/api/locator/search"
            
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'radius': radius_miles,
                'limit': 1
            }
            
            response = session.get(locator_url, params=params)
            
            if response.status_code != 200:
                return None
                
            data = response.json()
            
            if 'stores' in data and data['stores']:
                store = data['stores'][0]
                return str(store.get('storeId') or store.get('id'))
            
            return None
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway store lookup failed: {e}")
            return None