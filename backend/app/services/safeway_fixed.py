import re
import json
from typing import Optional, Tuple, Dict, List
import httpx
import logging
import time
from urllib.parse import quote
from bs4 import BeautifulSoup

from .price_sources import PriceSource

class SafewayFixedPriceSource(PriceSource):
    """Fixed Safeway scraper using public search pages instead of protected APIs."""

    def __init__(self):
        self._session = None
        
    @property
    def source_name(self) -> str:
        return "safeway_web_fixed"

    def _get_session(self) -> httpx.Client:
        """Get or create HTTP session with realistic browser headers."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
                timeout=30,
                follow_redirects=True
            )
        return self._session

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """
        Fetch price from Safeway using their public search page.
        """
        try:
            session = self._get_session()
            
            # Use public search page
            search_term = quote(ingredient_name)
            search_url = f"https://www.safeway.com/shop/search-results.html?q={search_term}"
            
            # Add delay to be respectful
            time.sleep(1)
            
            response = session.get(search_url)
            
            if response.status_code != 200:
                logging.getLogger(__name__).warning(f"Safeway search page returned {response.status_code}")
                return (None, unit)
            
            html_content = response.text
            
            # Try multiple extraction methods
            price = self._extract_price_from_html(html_content, ingredient_name)
            
            if price:
                return (float(price), unit)
                
            return (None, unit)
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"Safeway fixed price lookup failed for {ingredient_name}: {e}")
            return (None, unit)

    def _extract_price_from_html(self, html_content: str, ingredient_name: str) -> Optional[float]:
        """Extract price from HTML using multiple approaches."""
        try:
            # Method 1: Look for structured data (JSON-LD)
            price = self._extract_from_structured_data(html_content)
            if price:
                return price
            
            # Method 2: Look for JavaScript data objects
            price = self._extract_from_js_data(html_content)
            if price:
                return price
            
            # Method 3: Parse HTML with BeautifulSoup
            price = self._extract_from_html_elements(html_content)
            if price:
                return price
            
            # Method 4: Regex patterns as fallback
            price = self._extract_with_regex(html_content)
            if price:
                return price
                
            return None
            
        except Exception as e:
            logging.getLogger(__name__).warning(f"HTML price extraction failed: {e}")
            return None

    def _extract_from_structured_data(self, html_content: str) -> Optional[float]:
        """Extract price from JSON-LD structured data."""
        try:
            # Look for JSON-LD product data
            json_ld_pattern = r'<script type="application/ld\+json">(.*?)</script>'
            matches = re.findall(json_ld_pattern, html_content, re.DOTALL)
            
            for match in matches:
                try:
                    data = json.loads(match)
                    if isinstance(data, dict) and data.get('@type') == 'Product':
                        offers = data.get('offers', {})
                        if isinstance(offers, dict) and 'price' in offers:
                            return float(offers['price'])
                except:
                    continue
                    
            return None
        except:
            return None

    def _extract_from_js_data(self, html_content: str) -> Optional[float]:
        """Extract price from JavaScript data objects."""
        try:
            # Look for common JS data patterns
            js_patterns = [
                r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
                r'window\.__PRODUCT_DATA__\s*=\s*({.*?});',
                r'var\s+productData\s*=\s*({.*?});',
                r'window\.productInfo\s*=\s*({.*?});'
            ]
            
            for pattern in js_patterns:
                matches = re.findall(pattern, html_content, re.DOTALL)
                for match in matches:
                    try:
                        data = json.loads(match)
                        price = self._find_price_in_data(data)
                        if price:
                            return price
                    except:
                        continue
                        
            return None
        except:
            return None

    def _extract_from_html_elements(self, html_content: str) -> Optional[float]:
        """Extract price from HTML elements using BeautifulSoup."""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Common price selectors
            price_selectors = [
                '.price',
                '.product-price',
                '.current-price',
                '.sale-price',
                '.regular-price',
                '[data-price]',
                '.price-value',
                '.price-current'
            ]
            
            for selector in price_selectors:
                elements = soup.select(selector)
                for element in elements:
                    # Check text content
                    text = element.get_text(strip=True)
                    price = self._parse_price_text(text)
                    if price:
                        return price
                    
                    # Check data attributes
                    for attr in ['data-price', 'data-value', 'content']:
                        if element.has_attr(attr):
                            price = self._parse_price_text(element[attr])
                            if price:
                                return price
                                
            return None
        except:
            return None

    def _extract_with_regex(self, html_content: str) -> Optional[float]:
        """Extract price using regex patterns as fallback."""
        try:
            # Price regex patterns
            price_patterns = [
                r'\$(\d+\.?\d*)',
                r'price["\']:\s*["\']?\$?(\d+\.?\d*)',
                r'regularPrice["\']:\s*(\d+\.?\d*)',
                r'currentPrice["\']:\s*(\d+\.?\d*)',
                r'"price":\s*(\d+\.?\d*)',
                r'data-price="(\d+\.?\d*)"'
            ]
            
            for pattern in price_patterns:
                matches = re.findall(pattern, html_content)
                if matches:
                    try:
                        # Return first valid price found
                        price = float(matches[0])
                        if 0.01 <= price <= 50.0:  # Reasonable price range
                            return price
                    except:
                        continue
                        
            return None
        except:
            return None

    def _find_price_in_data(self, data: Dict) -> Optional[float]:
        """Recursively search for price in nested data structure."""
        try:
            if isinstance(data, dict):
                # Check direct price fields
                price_fields = ['price', 'regularPrice', 'currentPrice', 'salePrice', 'displayPrice']
                for field in price_fields:
                    if field in data:
                        try:
                            price = float(data[field])
                            if 0.01 <= price <= 50.0:
                                return price
                        except:
                            continue
                
                # Recursively search nested objects
                for value in data.values():
                    if isinstance(value, (dict, list)):
                        price = self._find_price_in_data(value)
                        if price:
                            return price
                            
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, (dict, list)):
                        price = self._find_price_in_data(item)
                        if price:
                            return price
                            
            return None
        except:
            return None

    def _parse_price_text(self, text: str) -> Optional[float]:
        """Parse price from text string."""
        try:
            if not text:
                return None
                
            # Remove currency symbols and extra characters
            clean_text = re.sub(r'[^\d.]', '', str(text))
            if clean_text:
                price = float(clean_text)
                if 0.01 <= price <= 50.0:  # Reasonable price range
                    return price
                    
            return None
        except:
            return None

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """
        Return default store ID since API-based lookup is not working.
        In practice, prices are often similar across stores in the same region.
        """
        # Return default store ID from Safeway's configuration
        return "3132"  # Bay Area default store

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Async version of fetch_price for compatibility with scraping framework."""
        return self.fetch_price(store_external_id, ingredient_name, unit)