-- 10_stores_prices.sql
-- Adds tables for grocery stores and ingredient price snapshots.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Stores table: deduplicated by Google Places place_id
CREATE TABLE IF NOT EXISTS stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id text UNIQUE NOT NULL,
    name text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    created_at timestamptz DEFAULT timezone('utc', now())
);

-- Prices table: latest price of an ingredient at a given store
CREATE TABLE IF NOT EXISTS prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    fetched_at timestamptz DEFAULT timezone('utc', now()),
    UNIQUE (ingredient_id, store_id)
);

-- Index to quickly retrieve prices for an ingredient across stores
CREATE INDEX IF NOT EXISTS idx_prices_ingredient ON prices(ingredient_id); 