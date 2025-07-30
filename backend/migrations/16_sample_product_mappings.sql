-- 16_sample_product_mappings.sql
-- Add sample product mappings for testing multi-retailer cart export

-- Sample Instacart product mappings
INSERT INTO product_mappings (ingredient_name, retailer, product_id) VALUES
('chicken breast', 'instacart', 'IC_CHICKEN_BREAST_001'),
('ground beef', 'instacart', 'IC_GROUND_BEEF_001'),
('eggs', 'instacart', 'IC_EGGS_001'),
('milk', 'instacart', 'IC_MILK_001'),
('bread', 'instacart', 'IC_BREAD_001'),
('rice', 'instacart', 'IC_RICE_001'),
('pasta', 'instacart', 'IC_PASTA_001'),
('tomatoes', 'instacart', 'IC_TOMATOES_001'),
('onions', 'instacart', 'IC_ONIONS_001'),
('garlic', 'instacart', 'IC_GARLIC_001'),
('olive oil', 'instacart', 'IC_OLIVE_OIL_001'),
('salt', 'instacart', 'IC_SALT_001'),
('pepper', 'instacart', 'IC_PEPPER_001'),
('cheese', 'instacart', 'IC_CHEESE_001'),
('broccoli', 'instacart', 'IC_BROCCOLI_001');

-- Sample Walmart product mappings
INSERT INTO product_mappings (ingredient_name, retailer, product_id) VALUES
('chicken breast', 'walmart', 'WM_CHICKEN_BREAST_001'),
('ground beef', 'walmart', 'WM_GROUND_BEEF_001'),
('eggs', 'walmart', 'WM_EGGS_001'),
('milk', 'walmart', 'WM_MILK_001'),
('bread', 'walmart', 'WM_BREAD_001'),
('rice', 'walmart', 'WM_RICE_001'),
('pasta', 'walmart', 'WM_PASTA_001'),
('tomatoes', 'walmart', 'WM_TOMATOES_001'),
('onions', 'walmart', 'WM_ONIONS_001'),
('garlic', 'walmart', 'WM_GARLIC_001'),
('olive oil', 'walmart', 'WM_OLIVE_OIL_001'),
('salt', 'walmart', 'WM_SALT_001'),
('pepper', 'walmart', 'WM_PEPPER_001'),
('cheese', 'walmart', 'WM_CHEESE_001'),
('broccoli', 'walmart', 'WM_BROCCOLI_001');

-- Sample Amazon Fresh product mappings (fewer items to show partial availability)
INSERT INTO product_mappings (ingredient_name, retailer, product_id) VALUES
('chicken breast', 'amazon_fresh', 'AF_CHICKEN_BREAST_001'),
('ground beef', 'amazon_fresh', 'AF_GROUND_BEEF_001'),
('eggs', 'amazon_fresh', 'AF_EGGS_001'),
('milk', 'amazon_fresh', 'AF_MILK_001'),
('bread', 'amazon_fresh', 'AF_BREAD_001'),
('rice', 'amazon_fresh', 'AF_RICE_001'),
('olive oil', 'amazon_fresh', 'AF_OLIVE_OIL_001'),
('salt', 'amazon_fresh', 'AF_SALT_001');

-- Sample Kroger product mappings (even fewer items)
INSERT INTO product_mappings (ingredient_name, retailer, product_id) VALUES
('chicken breast', 'kroger', 'KR_CHICKEN_BREAST_001'),
('ground beef', 'kroger', 'KR_GROUND_BEEF_001'),
('eggs', 'kroger', 'KR_EGGS_001'),
('milk', 'kroger', 'KR_MILK_001'),
('bread', 'kroger', 'KR_BREAD_001');

-- Sample Target product mappings (minimal items)
INSERT INTO product_mappings (ingredient_name, retailer, product_id) VALUES
('chicken breast', 'target', 'TG_CHICKEN_BREAST_001'),
('eggs', 'target', 'TG_EGGS_001'),
('milk', 'target', 'TG_MILK_001');