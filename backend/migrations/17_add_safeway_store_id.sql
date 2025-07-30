-- Add safeway_store_id column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS safeway_store_id VARCHAR(50);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stores_safeway_store_id ON stores(safeway_store_id);