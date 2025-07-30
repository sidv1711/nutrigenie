import re
import httpx
import time
from typing import Optional, Tuple
from bs4 import BeautifulSoup

from .price_sources import PriceSource

class AldiPriceSource(PriceSource):
    """ALDI grocery scraper - simple and reliable."""

    def __init__(self):
        self._session = None
        
    @property
    def source_name(self) -> str:
        return "aldi_web"

    def _get_session(self) -> httpx.Client:
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
                timeout=20,
                follow_redirects=True
            )
        return self._session

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        """Fetch price from ALDI."""
        try:
            session = self._get_session()
            
            # ALDI search URL
            search_url = f"https://www.aldi.us/en/products/search/?q={ingredient_name.replace(' ', '+')}"
            
            # Be respectful with requests
            time.sleep(1)
            
            response = session.get(search_url)
            if response.status_code != 200:
                return (None, unit)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for product price elements
            price_elements = soup.find_all(['span', 'div'], class_=re.compile(r'price', re.I))
            
            for element in price_elements:
                price_text = element.get_text(strip=True)
                price = self._extract_price(price_text)
                if price and 0.10 <= price <= 20.0:  # Reasonable range
                    return (price, unit)
            
            return (None, unit)
            
        except Exception as e:
            return (None, unit)

    def _extract_price(self, text: str) -> Optional[float]:
        """Extract price from text."""
        try:
            # Look for price patterns like $2.99, 2.99, etc.
            price_match = re.search(r'\$?(\d+\.?\d*)', text)
            if price_match:
                return float(price_match.group(1))
        except:
            pass
        return None

    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        return "aldi_default"

    async def async_fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Tuple[Optional[float], str]:
        return self.fetch_price(store_external_id, ingredient_name, unit)