#!/usr/bin/env python3
"""
Script to populate sample product mappings for testing multi-retailer cart export.
Run this to add sample product mappings to the database.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase import get_supabase_admin

def populate_mappings():
    """Populate sample product mappings."""
    supabase = get_supabase_admin()
    
    # Sample product mappings
    mappings = [
        # Instacart mappings
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
        ('broccoli', 'instacart', 'IC_BROCCOLI_001'),
        
        # Walmart mappings
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
        ('broccoli', 'walmart', 'WM_BROCCOLI_001'),
        
        # Amazon Fresh mappings (partial)
        ('chicken breast', 'amazon_fresh', 'AF_CHICKEN_BREAST_001'),
        ('ground beef', 'amazon_fresh', 'AF_GROUND_BEEF_001'),
        ('eggs', 'amazon_fresh', 'AF_EGGS_001'),
        ('milk', 'amazon_fresh', 'AF_MILK_001'),
        ('bread', 'amazon_fresh', 'AF_BREAD_001'),
        ('rice', 'amazon_fresh', 'AF_RICE_001'),
        ('olive oil', 'amazon_fresh', 'AF_OLIVE_OIL_001'),
        ('salt', 'amazon_fresh', 'AF_SALT_001'),
        
        # Kroger mappings (minimal)
        ('chicken breast', 'kroger', 'KR_CHICKEN_BREAST_001'),
        ('ground beef', 'kroger', 'KR_GROUND_BEEF_001'),
        ('eggs', 'kroger', 'KR_EGGS_001'),
        ('milk', 'kroger', 'KR_MILK_001'),
        ('bread', 'kroger', 'KR_BREAD_001'),
        
        # Target mappings (very minimal)
        ('chicken breast', 'target', 'TG_CHICKEN_BREAST_001'),
        ('eggs', 'target', 'TG_EGGS_001'),
        ('milk', 'target', 'TG_MILK_001'),
    ]
    
    # Insert mappings
    data = [
        {
            'ingredient_name': ingredient,
            'retailer': retailer,
            'product_id': product_id
        }
        for ingredient, retailer, product_id in mappings
    ]
    
    try:
        result = supabase.table('product_mappings').upsert(data, on_conflict='ingredient_name,retailer').execute()
        print(f"Successfully inserted {len(data)} product mappings")
        print("Sample mappings added for:")
        print("- Instacart: 15 items")
        print("- Walmart: 15 items")
        print("- Amazon Fresh: 8 items")
        print("- Kroger: 5 items")
        print("- Target: 3 items")
    except Exception as e:
        print(f"Error inserting mappings: {e}")
        sys.exit(1)

if __name__ == '__main__':
    populate_mappings()