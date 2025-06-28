#!/usr/bin/env python
"""Refresh stores_prices table using quick-win free sources.

Usage (from repo root, venv active):
    PYTHONPATH=backend python backend/scripts/refresh_prices.py

Environment:
    KROGER_CLIENT_ID / KROGER_CLIENT_SECRET – only needed for Kroger lookups.
"""

import datetime
import logging
from typing import List, Dict, Optional

from app.core.supabase import get_supabase_admin
from app.services.kroger import KrogerPriceSource
from app.services.walmart import WalmartPriceSource

# Ensure .env variables (including KROGER_CLIENT_ID / SECRET) are loaded when
# this script runs outside the FastAPI context.
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

SUPABASE = get_supabase_admin()

# Instantiate once so token caching works and metrics are shared.
KROGER = KrogerPriceSource()
WALMART = WalmartPriceSource()
SOURCES = [KROGER, WALMART]


def iter_store_mappings() -> List[Dict]:
    """Return each store row with the retailer-specific IDs we need."""
    res = (
        SUPABASE.table("stores")
        .select("place_id,kroger_location_id,walmart_store_id,lat,lon")
        .execute()
    )
    return res.data or []


def maybe_update_external_ids(store: Dict) -> Dict:
    """Fill missing retailer IDs and persist back to Supabase."""
    updated: Dict[str, Optional[str]] = {}

    lat = store.get("lat")
    lon = store.get("lon")
    if lat is None or lon is None:
        return store

    if not store.get("kroger_location_id"):
        kroger_id = KROGER.lookup_location_id(lat, lon)
        if kroger_id:
            updated["kroger_location_id"] = kroger_id

    if not store.get("walmart_store_id"):
        walmart_id = WALMART.lookup_store_id(lat, lon)
        if walmart_id:
            updated["walmart_store_id"] = walmart_id

    if updated:
        SUPABASE.table("stores").update(updated).eq("place_id", store["place_id"]).execute()
        logging.info("Updated store %s with %s", store["place_id"], updated)
        store.update(updated)

    return store


def iter_ingredients() -> List[Dict]:
    res = SUPABASE.table("ingredients").select("name, default_unit").execute()
    return res.data or []


def main():
    now = datetime.datetime.utcnow().isoformat()
    price_rows = []

    for raw_store in iter_store_mappings():
        store = maybe_update_external_ids(raw_store)
        for src in SOURCES:
            # map place_id → external id depending on source
            if src.source_name == "kroger_api":
                ext_id = store.get("kroger_location_id")
            elif src.source_name == "walmart_web":
                ext_id = store.get("walmart_store_id")
            else:
                ext_id = None
            if not ext_id:
                continue

            for ing in iter_ingredients():
                price = src.fetch_price(ext_id, ing["name"], ing["default_unit"])
                if price is None:
                    continue
                price_rows.append({
                    "place_id": store["place_id"],
                    "ingredient_name": ing["name"],
                    "unit": ing["default_unit"],
                    "price_per_unit": price,
                    "last_seen_at": now,
                })

    logging.info("Upserting %d price rows", len(price_rows))
    for row in price_rows:
        SUPABASE.table("stores_prices").upsert(row).execute()


if __name__ == "__main__":
    main() 