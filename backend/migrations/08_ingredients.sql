-- 08_ingredients.sql
-- Adds ingredients master table and recipe_ingredients junction table.

-- Enable gen_random_uuid if not already (Supabase has pgcrypto by default)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ingredients table (one row per unique ingredient name)
CREATE TABLE IF NOT EXISTS ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    category text,
    default_unit text
);

-- 2. Junction table linking recipes ↔ ingredients with quantities and price estimates
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    price_per_unit numeric,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- 3. Convenience index for fast look-up by ingredient
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients (ingredient_id); 