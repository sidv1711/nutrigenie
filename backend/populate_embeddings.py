#!/usr/bin/env python3
"""
Script to populate embeddings for existing ingredients in the database.
Run this once to initialize the RAG system with embeddings for all existing ingredients.
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from app.services.embeddings import get_embedding_service
from app.core.supabase import get_supabase_admin

def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def populate_embeddings():
    """Populate embeddings for all ingredients without embeddings."""
    logging.info("Starting ingredient embedding population...")
    
    try:
        # Get services
        embedding_service = get_embedding_service()
        supabase = get_supabase_admin()
        
        # Get all ingredients without embeddings
        result = supabase.table("ingredients").select("id, name").is_("embedding", "null").execute()
        
        ingredients = result.data or []
        total_count = len(ingredients)
        
        if total_count == 0:
            logging.info("No ingredients found without embeddings. All ingredients are already processed.")
            return True
        
        logging.info(f"Found {total_count} ingredients without embeddings. Starting processing...")
        
        # Process ingredients in batches
        batch_size = 20
        successful = 0
        failed = 0
        
        for i in range(0, total_count, batch_size):
            batch = ingredients[i:i + batch_size]
            batch_names = [ing["name"] for ing in batch]
            
            logging.info(f"Processing batch {i//batch_size + 1}/{(total_count + batch_size - 1)//batch_size}: {len(batch_names)} ingredients")
            
            # Process batch
            results = embedding_service.batch_embed_ingredients(batch_names)
            
            # Count results
            for name, ingredient_id in results.items():
                if ingredient_id:
                    successful += 1
                    logging.info(f"✓ {name} -> {ingredient_id}")
                else:
                    failed += 1
                    logging.warning(f"✗ Failed to process: {name}")
        
        logging.info(f"Embedding population completed!")
        logging.info(f"Total processed: {total_count}")
        logging.info(f"Successful: {successful}")
        logging.info(f"Failed: {failed}")
        logging.info(f"Success rate: {successful/total_count*100:.1f}%")
        
        return failed == 0
        
    except Exception as e:
        logging.error(f"Error during embedding population: {e}")
        return False

def check_embedding_stats():
    """Check and display embedding statistics."""
    try:
        supabase = get_supabase_admin()
        
        # Get total ingredients
        total_result = supabase.table("ingredients").select("id", count="exact").execute()
        total = total_result.count or 0
        
        # Get ingredients with embeddings
        embedded_result = supabase.table("ingredients").select("id", count="exact").not_.is_("embedding", "null").execute()
        embedded = embedded_result.count or 0
        
        # Get ingredients without embeddings
        missing_result = supabase.table("ingredients").select("id", count="exact").is_("embedding", "null").execute()
        missing = missing_result.count or 0
        
        logging.info("=== Embedding Statistics ===")
        logging.info(f"Total ingredients: {total}")
        logging.info(f"With embeddings: {embedded}")
        logging.info(f"Missing embeddings: {missing}")
        logging.info(f"Coverage: {embedded/total*100:.1f}%" if total > 0 else "Coverage: 0%")
        
        return {
            "total": total,
            "embedded": embedded, 
            "missing": missing,
            "coverage": embedded/total if total > 0 else 0
        }
        
    except Exception as e:
        logging.error(f"Error checking embedding stats: {e}")
        return None

def main():
    """Main function."""
    setup_logging()
    
    logging.info("Ingredient Embedding Population Tool")
    logging.info("=" * 40)
    
    # Check initial stats
    initial_stats = check_embedding_stats()
    if not initial_stats:
        logging.error("Failed to check initial statistics")
        return 1
    
    if initial_stats["missing"] == 0:
        logging.info("All ingredients already have embeddings. Nothing to do.")
        return 0
    
    # Populate embeddings
    success = populate_embeddings()
    
    # Check final stats
    logging.info("\nFinal statistics:")
    final_stats = check_embedding_stats()
    
    if success and final_stats and final_stats["missing"] == 0:
        logging.info("🎉 All ingredients now have embeddings! RAG system is ready.")
        return 0
    else:
        logging.warning("Some ingredients may still be missing embeddings. Check the logs above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)