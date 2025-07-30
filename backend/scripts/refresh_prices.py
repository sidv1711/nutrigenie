#!/usr/bin/env python
"""Refresh stores_prices table using quick-win free sources.

Usage (from repo root, venv active):
    PYTHONPATH=backend python backend/scripts/refresh_prices.py

Environment:
    KROGER_CLIENT_ID / KROGER_CLIENT_SECRET – only needed for Kroger lookups.
"""

import datetime
import logging
import asyncio
from typing import List, Dict, Optional

from app.core.supabase import get_supabase_admin
from app.services.kroger import KrogerPriceSource
from app.services.walmart import WalmartPriceSource
from app.services.safeway_fallback import SafewayFallbackPriceSource
from app.services.instacart import InstacartWholeFoodsSource, InstacartSafewaySource

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
SAFEWAY = SafewayFallbackPriceSource()
INSTACART_WF = InstacartWholeFoodsSource()
INSTACART_SAFEWAY = InstacartSafewaySource()

# Note: Instacart sources are disabled by default due to complexity
# Safeway now uses fallback pricing with realistic estimates instead of broken web scraping
SOURCES = [KROGER, WALMART, SAFEWAY]
# SOURCES = [KROGER, WALMART, SAFEWAY, INSTACART_WF, INSTACART_SAFEWAY]

CONCURRENCY = 20


def iter_store_mappings() -> List[Dict]:
    """Return each store row with the retailer-specific IDs we need."""
    try:
        # Try with safeway_store_id column
        res = (
            SUPABASE.table("stores")
            .select("place_id,kroger_location_id,walmart_store_id,safeway_store_id,name,lat,lon")
            .execute()
        )
    except:
        # Fallback without safeway_store_id if column doesn't exist
        res = (
            SUPABASE.table("stores")
            .select("place_id,kroger_location_id,walmart_store_id,name,lat,lon")
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
        banners = [
            "kroger",
            "ralph",
            "fred meyer",
            "fry",
            "king soopers",
            "harris teeter",
            "smith",
            "city market",
            "pick n save",
        ]
        store_name = (store.get("name") or "").lower()
        if any(b in store_name for b in banners):
            kroger_id = KROGER.lookup_location_id(lat, lon)
            if kroger_id:
                updated["kroger_location_id"] = kroger_id

    if not store.get("walmart_store_id"):
        walmart_id = WALMART.lookup_store_id(lat, lon)
        if walmart_id:
            updated["walmart_store_id"] = walmart_id

    # Only try to update safeway_store_id if the column exists
    if 'safeway_store_id' in store and not store.get("safeway_store_id"):
        safeway_banners = [
            "safeway",
            "albertsons",
            "vons",
            "pavilions",
            "tom thumb",
            "randalls",
            "shaw",
            "star market",
            "acme"
        ]
        store_name = (store.get("name") or "").lower()
        if any(b in store_name for b in safeway_banners):
            safeway_id = SAFEWAY.lookup_store_id(lat, lon)
            if safeway_id:
                updated["safeway_store_id"] = safeway_id

    if updated:
        SUPABASE.table("stores").update(updated).eq("place_id", store["place_id"]).execute()
        logging.info("Updated store %s with %s", store["place_id"], updated)
        store.update(updated)

    return store


def iter_ingredients() -> List[Dict]:
    """Return ingredient rows with a unit field.

    Some older databases may lack the `default_unit` column. In that case we
    fall back to the generic `unit` column so the loader still works instead
    of crashing.
    """
    try:
        res = SUPABASE.table("ingredients").select("name, default_unit").execute()
        cleaned = []
        for row in (res.data or []):
            unit_val = row.get("default_unit") or row.get("unit") or "each"
            cleaned.append({"name": row["name"], "default_unit": unit_val})
        return cleaned
    except Exception:
        # Column likely missing – fallback to `unit`.
        res = SUPABASE.table("ingredients").select("name, unit").execute()
        # Remap key to keep downstream code unchanged
        cleaned = []
        for row in (res.data or []):
            unit_val = row.get("default_unit") or row.get("unit") or "each"
            cleaned.append({"name": row["name"], "default_unit": unit_val})
        return cleaned


async def gather_prices() -> List[Dict]:
    """Fetch all prices concurrently and return the list of upsert rows."""
    now = datetime.datetime.utcnow().isoformat()

    semaphore = asyncio.Semaphore(CONCURRENCY)

    ingredients = iter_ingredients()  # fetch once
    price_rows: List[Dict] = []

    async def fetch_one(store: Dict, src, ext_id: str, ing: Dict):
        async with semaphore:
            price, resolved_unit = await src.async_fetch_price(ext_id, ing["name"], ing["default_unit"])
            if price is None:
                return None
            return {
                "place_id": store["place_id"],
                "ingredient_name": ing["name"],
                "unit": resolved_unit or ing["default_unit"],
                "price_per_unit": price,
                "last_seen_at": now,
            }

    tasks = []
    for raw_store in iter_store_mappings():
        store = maybe_update_external_ids(raw_store)
        for src in SOURCES:
            # map place_id → external id depending on source
            if src.source_name == "kroger_api":
                ext_id = store.get("kroger_location_id")
            elif src.source_name == "walmart_web":
                ext_id = store.get("walmart_store_id")
            elif src.source_name == "safeway_fallback":
                # Use default store ID for fallback pricing
                ext_id = store.get("safeway_store_id") or "3132"  # Default store ID
            elif src.source_name.startswith("instacart_"):
                ext_id = store.get("instacart_zone_id")
            else:
                ext_id = None
            if not ext_id:
                continue

            for ing in ingredients:
                tasks.append(fetch_one(store, src, ext_id, ing))

    for coro in asyncio.as_completed(tasks):
        row = await coro
        if row:
            price_rows.append(row)

    return price_rows


def bulk_upsert(rows: List[Dict]):
    if not rows:
        logging.info("No rows to upsert; exiting")
        return
    
    # Deduplicate rows by (place_id, ingredient_name) keeping the most recent/best price
    seen = {}
    deduplicated = []
    
    for row in rows:
        key = (row["place_id"], row["ingredient_name"])
        if key not in seen or row["price_per_unit"] < seen[key]["price_per_unit"]:
            seen[key] = row
    
    deduplicated = list(seen.values())
    
    logging.info("Bulk upserting %d deduplicated rows (from %d total)", len(deduplicated), len(rows))
    SUPABASE.table("stores_prices").upsert(deduplicated).execute()


def main():
    price_rows = asyncio.run(gather_prices())
    bulk_upsert(price_rows)


if __name__ == "__main__":
    main() 