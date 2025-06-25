-- 09_unique_ingredients.sql
-- Ensure ingredients.name is unique for ON CONFLICT(name) upserts
ALTER TABLE ingredients
    ADD CONSTRAINT IF NOT EXISTS ingredients_name_key UNIQUE (name); 