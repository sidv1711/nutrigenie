-- Allow multiple meal plans per start date per user by dropping unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meal_plans_user_id_start_date_key'
    ) THEN
        ALTER TABLE meal_plans
            DROP CONSTRAINT meal_plans_user_id_start_date_key;
    END IF;
END $$;

-- Ensure recipe names are unique so upsert ON CONFLICT(name) works
ALTER TABLE recipes
    ADD CONSTRAINT IF NOT EXISTS recipes_name_key UNIQUE (name); 