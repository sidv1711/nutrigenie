"""
Instacart Public API integration (while waiting for Partner API approval).
Uses publicly available endpoints for basic product information.
"""

from typing import Optional, Tuple, Dict, List
import httpx
import logging
import json
import re
from urllib.parse import quote

from .price_sources import PriceSource

class InstacartPublicAPI(PriceSource):
    """
    Instacart public/storefront integration for basic product data.
    Limited functionality compared to Partner API but doesn't require approval.
    """

    def __init__(self):
        self._session = None
        self._store_cache = {}
        
    @property
    def source_name(self) -> str:
        return "instacart_public"

    def _get_session(self) -> httpx.Client:
        """Get HTTP session with browser-like headers."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/html, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.instacart.com/",
                    "Origin": "https://www.instacart.com"
                },
                timeout=20,
                follow_redirects=True
            )
        return self._session

    def search_store_products(self, store_slug: str, query: str, limit: int = 10) -> List[Dict]:
        """
        Search for products in a specific Instacart store.
        
        Args:
            store_slug: Store identifier (e.g., "safeway", "kroger", "costco")
            query: Search term
            limit: Max results
            
        Returns:
            List of product dictionaries
        """
        try:
            session = self._get_session()
            
            # Try Instacart's store search endpoint
            search_url = f"https://www.instacart.com/store/{store_slug}/search/{quote(query)}"
            
            response = session.get(search_url)
            
            if response.status_code != 200:
                return []
            
            # Try to extract product data from the page
            products = self._extract_products_from_html(response.text, query)
            
            return products[:limit]
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart store search failed for {store_slug}/{query}: {e}")
            return []

    def _extract_products_from_html(self, html_content: str, query: str) -> List[Dict]:
        """Extract product information from Instacart HTML page."""
        products = []
        
        try:
            # Look for JSON data embedded in the page
            json_patterns = [
                r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
                r'window\.__STORE_STATE__\s*=\s*({.*?});',
                r'"products"\s*:\s*(\[.*?\])',
                r'window\.IC_STORE_DATA\s*=\s*({.*?});'
            ]
            
            for pattern in json_patterns:
                matches = re.findall(pattern, html_content, re.DOTALL)
                for match in matches:
                    try:
                        data = json.loads(match)
                        extracted_products = self._extract_products_from_json(data, query)
                        products.extend(extracted_products)
                    except json.JSONDecodeError:
                        continue
                        
            # Also try regex patterns for product data
            if not products:
                products = self._extract_products_with_regex(html_content, query)
                
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to extract products from HTML: {e}")
            
        return products

    def _extract_products_from_json(self, data: Dict, query: str) -> List[Dict]:
        """Recursively extract product information from JSON data."""
        products = []
        
        try:
            if isinstance(data, dict):
                # Look for product arrays
                if 'products' in data and isinstance(data['products'], list):
                    for product in data['products']:
                        if isinstance(product, dict):
                            extracted = self._normalize_product_data(product)
                            if extracted:
                                products.append(extracted)
                
                # Look for catalog data
                elif 'catalog' in data:
                    catalog_products = self._extract_products_from_json(data['catalog'], query)
                    products.extend(catalog_products)
                
                # Recursively search nested objects
                else:
                    for value in data.values():
                        if isinstance(value, (dict, list)):
                            nested_products = self._extract_products_from_json(value, query)
                            products.extend(nested_products)
                            
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        extracted = self._normalize_product_data(item)
                        if extracted:
                            products.append(extracted)
                        else:
                            nested_products = self._extract_products_from_json(item, query)
                            products.extend(nested_products)
                            
        except Exception as e:
            logging.getLogger(__name__).warning(f"JSON product extraction error: {e}")
            
        return products

    def _normalize_product_data(self, product: Dict) -> Optional[Dict]:
        """Normalize product data to consistent format."""
        try:
            # Look for required fields
            name = product.get('name') or product.get('title') or product.get('display_name')
            if not name:
                return None
                
            # Extract price information
            price = None
            unit = None
            
            # Try different price field patterns
            price_fields = ['price', 'current_price', 'display_price', 'pricing']
            for field in price_fields:
                if field in product:
                    price_data = product[field]
                    if isinstance(price_data, dict):
                        price = price_data.get('amount') or price_data.get('value')
                        unit = price_data.get('unit') or price_data.get('unit_type')
                    elif isinstance(price_data, (int, float)):
                        price = price_data
                    elif isinstance(price_data, str):
                        # Extract price from string like "$3.99"
                        price_match = re.search(r'\$?(\d+\.?\d*)', str(price_data))
                        if price_match:
                            price = float(price_match.group(1))
                    break
            
            # Extract unit information
            if not unit:
                unit_fields = ['unit', 'size', 'unit_type', 'package_size']
                for field in unit_fields:
                    if field in product and product[field]:
                        unit = str(product[field])
                        break
            
            return {
                "id": product.get('id') or product.get('product_id'),
                "name": name,
                "price": price,
                "unit": unit or "each",
                "brand": product.get('brand'),
                "size": product.get('size'),
                "in_stock": product.get('in_stock', True),
                "image_url": product.get('image_url') or product.get('image')
            }
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Product normalization error: {e}")
            return None

    def _extract_products_with_regex(self, html_content: str, query: str) -> List[Dict]:
        """Fallback: extract products using regex patterns."""
        products = []
        
        try:
            # Pattern for product cards in HTML
            product_pattern = r'data-testid="product-card".*?data-product-id="([^"]+)".*?<h3[^>]*>([^<]+)</h3>.*?\$(\d+\.?\d*)'
            matches = re.findall(product_pattern, html_content, re.DOTALL)
            
            for match in matches:
                product_id, name, price = match
                products.append({
                    "id": product_id,
                    "name": name.strip(),
                    "price": float(price),
                    "unit": "each",
                    "in_stock": True
                })
                
        except Exception as e:
            logging.getLogger(__name__).warning(f"Regex product extraction error: {e}")
            
        return products

    # PriceSource Interface Implementation

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price using public Instacart endpoints.
        
        Args:
            store_external_id: Store slug (e.g., "safeway", "kroger")
            ingredient_name: Ingredient to search for
            unit: Desired unit
            
        Returns:
            Tuple of (price_per_unit, actual_unit)
        """
        try:
            # Search for products
            products = self.search_store_products(store_external_id, ingredient_name, limit=5)
            
            if not products:
                return (None, unit)
            
            # Find best matching product
            best_product = self._find_best_product_match(products, ingredient_name)
            
            if not best_product or not best_product.get("price"):
                return (None, unit)
            
            price = best_product["price"]
            actual_unit = best_product.get("unit", unit)
            
            return (float(price), actual_unit)
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Instacart public fetch_price failed for {ingredient_name}: {e}")
            return (None, unit)

    def _find_best_product_match(self, products: List[Dict], ingredient_name: str) -> Optional[Dict]:
        """Find the product that best matches the ingredient name."""
        if not products:
            return None
            
        ingredient_lower = ingredient_name.lower()
        best_score = 0
        best_product = None
        
        for product in products:
            if not product.get("name"):
                continue
                
            product_name = product["name"].lower()
            
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
            
            # Prefer in-stock products
            if product.get("in_stock", True):
                score += 1
                
            if score > best_score:
                best_score = score
                best_product = product
                
        return best_product if best_score > 0 else products[0]

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """Return common store slug based on location (simplified)."""
        # For now, return a default popular store
        # TODO: Implement actual store lookup once we have better API access
        return "safeway"

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Async version of fetch_price."""
        return self.fetch_price(store_external_id, ingredient_name, unit)

    def get_supported_stores(self) -> List[str]:
        """Get list of store slugs we can search."""
        return [
            "safeway", "kroger", "costco", "trader-joes", "whole-foods-market",
            "target", "cvs", "walgreens", "petco", "sephora"
        ]

# Example usage:
"""
# Test public API while waiting for Partner API approval
instacart_public = InstacartPublicAPI()

# Search for products
products = instacart_public.search_store_products("safeway", "organic milk")
print(f"Found {len(products)} products")

# Get pricing
price, unit = instacart_public.fetch_price("safeway", "milk", "gallon")
print(f"Milk costs ${price} per {unit}")
"""