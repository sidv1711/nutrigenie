import os
import time
import httpx
from typing import Optional
import logging
import re

from .price_sources import PriceSource

_TOKEN: Optional[str] = None
_TOKEN_EXP: float = 0

KROGER_TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token"
KROGER_PRODUCTS_URL = "https://api.kroger.com/v1/products"

SIZE_RE = re.compile(r"([\d\.]+)\s*(oz|fl\s?oz|lb|lbs?|g|kg|ml|l|ct)", re.I)

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

    @staticmethod
    def _normalize_unit(raw: str) -> str:
        raw = raw.lower().strip()
        if raw in {"lbs", "lb"}:
            return "lb"
        if raw in {"fl oz", "floz", "fl-oz"}:
            return "fl-oz"
        return raw

    def fetch_price(self, store_external_id: str, ingredient_name: str, unit: str):
        # store_external_id is Kroger locationId
        try:
            token = self._get_token()
        except RuntimeError:
            return (None, unit)

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
                return (None, unit)

            variant = items[0]["items"][0]
            price_cents = variant["price"]["regular"]
            price_dollars = price_cents / 100.0

            size_str = variant.get("size") or ""
            m = SIZE_RE.search(size_str)
            if m:
                qty = float(m.group(1))
                parsed_unit = self._normalize_unit(m.group(2))
                if qty > 0:
                    return (price_dollars / qty, parsed_unit)
            # Fallback – cannot parse size, return pack price with default unit
            return (price_dollars, unit)
        except Exception:
            return (None, unit)

    # -------------------------
    # Store-ID lookup utilities
    # -------------------------
    def lookup_location_id(
        self, latitude: float, longitude: float, radius_miles: int = 10
    ) -> Optional[str]:
        """Return the Kroger `locationId` closest to the given lat/lon.

        Used to map a Google Places store row to Kroger's internal identifier
        so that price calls can be scoped per-store. Returns ``None`` if no
        Kroger store is found within the provided radius.
        """
        try:
            token = self._get_token()
        except RuntimeError:
            return None

        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        params = {
            "filter.latLong": f"{latitude},{longitude}",
            "filter.radiusInMiles": radius_miles,
            "filter.limit": 1,
        }

        try:
            resp = httpx.get(
                "https://api.kroger.com/v1/locations",
                headers=headers,
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get("data", [])
            if not items:
                return None
            return str(items[0].get("locationId"))
        except Exception as exc:
            logging.getLogger(__name__).warning("Kroger lookup failed: %s", exc)
            return None