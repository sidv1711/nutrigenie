#!/usr/bin/env python
"""Insert a handful of mock ingredient prices into the stores_prices table.
Run with:  python backend/scripts/load_mock_prices.py
"""
import datetime
from typing import List, Dict
from app.core.supabase import get_supabase_admin

MOCK_ROWS: List[Dict] = [
    # place_id, ingredient_name, unit, price_per_unit
    {
        "place_id": "ChIJsQw6BcN9hYARI8RTGY04-Dk",  # Trader Joe's Berkeley
        "ingredient_name": "banana",
        "unit": "each",
        "price_per_unit": 0.25,
    },
    {
        "place_id": "ChIJsQw6BcN9hYARI8RTGY04-Dk",
        "ingredient_name": "rolled oats",
        "unit": "cup",
        "price_per_unit": 0.40,
    },
    {
        "place_id": "ChIJh18Bd9R9hYARs_JG-G0td7A",  # Whole Foods Berkeley
        "ingredient_name": "banana",
        "unit": "each",
        "price_per_unit": 0.35,
    },
    {
        "place_id": "ChIJxRCJY4B-hYAR8pED77RBzRY",  # Berkeley Bowl
        "ingredient_name": "chicken breast",
        "unit": "g",
        "price_per_unit": 0.01,  # $10 / kg
    },
]

def main():
    supabase = get_supabase_admin()
    now = datetime.datetime.utcnow().isoformat()
    for row in MOCK_ROWS:
        data = {
            **row,
            "last_seen_at": now,
        }
        supabase.table("stores_prices").upsert(data).execute()
    print(f"Inserted/updated {len(MOCK_ROWS)} mock price rows.")

if __name__ == "__main__":
    main() 