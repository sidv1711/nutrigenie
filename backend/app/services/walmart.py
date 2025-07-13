import re
import json
from typing import Optional
import httpx
import logging

from .price_sources import PriceSource

_JSON_RE = re.compile(r'window\.__WML_REDUX_INITIAL_STATE__\s*=\s*(\{.*?\})\s*;')

class WalmartPriceSource(PriceSource):
    """Scrapes Walmart search page for first result price (no API key)."""

    @property
    def source_name(self) -> str:
        return "walmart_web"

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str):
        # store_external_id is Walmart numeric store id (string)
        url = (
            f"https://www.walmart.com/search?q={ingredient_name.replace(' ', '%20')}"
            f"&store={store_external_id}&facet=store_availability%3A1"
        )
        try:
            r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            r.raise_for_status()
        except Exception:
            return (None, unit)

        m = _JSON_RE.search(r.text)
        if not m:
            return (None, unit)
        try:
            data = json.loads(m.group(1))
            items = (
                data.get("search", {})
                .get("searchResult", {})
                .get("itemStacks", [{}])[0]
                .get("items", [])
            )
            if not items:
                return (None, unit)
            price_info = items[0].get("price", {})
            price = price_info.get("price") or price_info.get("minPrice")
            if price is None:
                return (None, unit)
            return (float(price), unit)
        except Exception:
            return (None, unit)

    # -------------------------
    # Store-ID lookup utilities
    # -------------------------
    def lookup_store_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """Return the numeric Walmart store ID closest to the given lat/lon.

        Scrapes the public store-finder JSON that the walmart.com site calls.
        Returns None if nothing within radius.
        """
        try:
            url = (
                "https://www.walmart.com/store/finder/v3/data"
                f"?latitude={latitude}&longitude={longitude}&distance={radius_miles}"
            )
            r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            r.raise_for_status()
            data = r.json()
            stores = data.get("stores", [])
            if not stores:
                return None
            return str(stores[0].get("id"))
        except Exception as exc:
            logging.getLogger(__name__).warning("Walmart store lookup failed: %s", exc)
            return None 