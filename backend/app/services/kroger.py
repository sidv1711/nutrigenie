import os
import time
import httpx
from typing import Optional
import logging

from .price_sources import PriceSource

_TOKEN: Optional[str] = None
_TOKEN_EXP: float = 0

KROGER_TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token"
KROGER_PRODUCTS_URL = "https://api.kroger.com/v1/products"

class KrogerPriceSource(PriceSource):
    """Fetch prices from the public Kroger Product API."""

    @property
    def source_name(self) -> str:
        return "kroger_api"

    def _get_token(self) -> str:
        global _TOKEN, _TOKEN_EXP
        if _TOKEN and _TOKEN_EXP - time.time() > 60:
            return _TOKEN

        cid = os.getenv("KROGER_CLIENT_ID")
        secret = os.getenv("KROGER_CLIENT_SECRET")
        if not cid or not secret:
            raise RuntimeError("Missing KROGER_CLIENT_ID / KROGER_CLIENT_SECRET env vars")

        resp = httpx.post(
            KROGER_TOKEN_URL,
            data={"grant_type": "client_credentials", "scope": "product.compact"},
            auth=(cid, secret),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        _TOKEN = data["access_token"]
        _TOKEN_EXP = time.time() + int(data["expires_in"])
        return _TOKEN

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str) -> Optional[float]:
        # store_external_id is Kroger locationId
        try:
            token = self._get_token()
        except RuntimeError:
            return None

        params = {
            "filter.locationId": store_external_id,
            "filter.term": ingredient_name,
            "filter.limit": 1,
        }
        headers = {"Authorization": f"Bearer {token}"}
        try:
            r = httpx.get(KROGER_PRODUCTS_URL, params=params, headers=headers, timeout=10)
            r.raise_for_status()
            items = r.json().get("data", [])
            if not items:
                return None
            price_cents = items[0]["items"][0]["price"]["regular"]
            return price_cents / 100.0
        except Exception:
            return None

    # -------------------------
    # Store-ID lookup utilities
    # -------------------------
    def lookup_location_id(self, latitude: float, longitude: float, radius_miles: int = 10) -> Optional[str]:
        """Return Kroger `locationId` closest to the provided coordinates.

        Useful for mapping a Google Places row (lat/lon) → Kroger's internal
        store identifier so that subsequent price calls can be scoped.
        Returns None if no store is found within the radius.
        """
        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        params = {
            "filter.latLong": f"{latitude},{longitude}",
            "filter.radiusInMiles": radius_miles,
            "filter.limit": 1,
        }
        try:
            resp = httpx.get("https://api.kroger.com/v1/locations", headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            items = data.get("data", [])
            if not items:
                return None
            return str(items[0].get("locationId"))
        except Exception as exc:
            # Do not propagate – just return None so caller can fall back
            logging.getLogger(__name__).warning("Kroger lookup failed: %s", exc)
            return None 