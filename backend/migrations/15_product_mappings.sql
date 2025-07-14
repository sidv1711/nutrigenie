-- 15_product_mappings.sql
CREATE TABLE IF NOT EXISTS product_mappings (
    ingredient_name TEXT NOT NULL,
    retailer TEXT NOT NULL,
    product_id TEXT NOT NULL,
    PRIMARY KEY (ingredient_name, retailer)
); 