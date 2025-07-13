-- 14_add_default_unit.sql
-- Adds default_unit column to ingredients if it does not yet exist (for remote DBs created before 08_ingredients.sql revision).
ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS default_unit text; 