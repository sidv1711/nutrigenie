-- 13_store_external_ids.sql
-- Add retailer-specific id columns to stores table for price lookups
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS kroger_location_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS walmart_store_id VARCHAR(32);

-- Useful index for lookups in refresh script
CREATE INDEX IF NOT EXISTS idx_stores_kroger_location_id ON stores(kroger_location_id);
CREATE INDEX IF NOT EXISTS idx_stores_walmart_store_id ON stores(walmart_store_id); 