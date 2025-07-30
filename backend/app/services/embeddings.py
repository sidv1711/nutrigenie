"""
Embedding service for ingredient semantic search using OpenAI embeddings and pgvector.
"""

import logging
from typing import List, Optional, Dict, Any
import numpy as np
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from ..core.config import settings
from ..core.supabase import get_supabase_admin

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# Initialize LangChain embeddings
embeddings_model = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key=settings.OPENAI_API_KEY
)

class IngredientEmbeddingService:
    """Service for managing ingredient embeddings and semantic search."""
    
    def __init__(self):
        self.embedding_model = embeddings_model
        self.supabase = get_supabase_admin()
        
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text using OpenAI's text-embedding-3-small."""
        try:
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text.strip(),
                encoding_format="float",
                timeout=10  # 10 second timeout for embeddings
            )
            return response.data[0].embedding
        except Exception as e:
            logging.error(f"Error generating embedding for '{text}': {e}")
            return []
    
    def embed_ingredient(self, ingredient_name: str) -> Optional[str]:
        """
        Generate and store embedding for an ingredient.
        Returns the ingredient ID if successful.
        """
        try:
            # Normalize ingredient name
            normalized_name = ingredient_name.strip().lower()
            
            # Generate embedding
            embedding = self.generate_embedding(normalized_name)
            if not embedding:
                return None
            
            # Check if ingredient exists
            existing = self.supabase.table("ingredients").select("id").eq("name", normalized_name).execute()
            
            if existing.data:
                # Update existing ingredient with embedding
                ingredient_id = existing.data[0]["id"]
                result = self.supabase.table("ingredients").update({
                    "embedding": embedding
                }).eq("id", ingredient_id).execute()
                
                if not result.data:
                    logging.error(f"Error updating embedding for ingredient '{normalized_name}': No data returned")
                    return None
                    
                logging.info(f"Updated embedding for existing ingredient: {normalized_name}")
                return ingredient_id
            else:
                # Create new ingredient with embedding
                result = self.supabase.table("ingredients").insert({
                    "name": normalized_name,
                    "category": "general",  # Default category
                    "unit": "unit",  # Default unit
                    "price_per_unit": 0.0,  # Default price
                    "embedding": embedding
                }).execute()
                
                if not result.data:
                    logging.error(f"Error creating ingredient '{normalized_name}': No data returned")
                    return None
                    
                ingredient_id = result.data[0]["id"]
                logging.info(f"Created new ingredient with embedding: {normalized_name}")
                return ingredient_id
                
        except Exception as e:
            logging.error(f"Error in embed_ingredient for '{ingredient_name}': {e}")
            return None
    
    def find_similar_ingredients(
        self, 
        query: str, 
        similarity_threshold: float = 0.7,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find ingredients similar to the query using semantic search.
        
        Args:
            query: The ingredient name to search for
            similarity_threshold: Minimum similarity score (0-1)
            limit: Maximum number of results to return
            
        Returns:
            List of ingredients with similarity scores
        """
        try:
            # Generate embedding for query
            query_embedding = self.generate_embedding(query.strip().lower())
            if not query_embedding:
                return []
            
            # Use the match_embeddings function from the database
            try:
                result = self.supabase.rpc(
                    "match_embeddings",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": similarity_threshold,
                        "match_count": limit
                    }
                ).execute()
                
                if not result.data:
                    logging.debug(f"No similar ingredients found for '{query}' (empty database or no matches)")
                    return []
            except Exception as e:
                logging.warning(f"Similarity search failed for '{query}': {e}")
                return []
            
            # Get ingredient details for matches
            matches = []
            for match in result.data or []:
                content = match.get("content", "")
                similarity = match.get("similarity", 0.0)
                
                # Get full ingredient details
                ingredient_result = self.supabase.table("ingredients").select("*").eq("name", content).execute()
                
                if ingredient_result.data:
                    ingredient = ingredient_result.data[0]
                    matches.append({
                        "ingredient": ingredient,
                        "similarity": similarity,
                        "matched_text": content
                    })
            
            return matches
            
        except Exception as e:
            logging.error(f"Error in find_similar_ingredients for '{query}': {e}")
            return []
    
    def batch_embed_ingredients(self, ingredient_names: List[str]) -> Dict[str, Optional[str]]:
        """
        Generate embeddings for multiple ingredients in batch.
        
        Args:
            ingredient_names: List of ingredient names to embed
            
        Returns:
            Dictionary mapping ingredient names to their IDs (or None if failed)
        """
        results = {}
        
        for name in ingredient_names:
            try:
                ingredient_id = self.embed_ingredient(name)
                results[name] = ingredient_id
                logging.info(f"Processed embedding for: {name} -> {ingredient_id}")
            except Exception as e:
                logging.error(f"Error processing ingredient '{name}': {e}")
                results[name] = None
        
        return results
    
    def get_ingredient_suggestions(
        self, 
        partial_name: str, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get ingredient suggestions based on partial name using both exact matching and semantic search.
        
        Args:
            partial_name: Partial ingredient name
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested ingredients with confidence scores
        """
        suggestions = []
        
        try:
            # First, try exact prefix matching
            exact_matches = self.supabase.table("ingredients").select("*").ilike("name", f"{partial_name}%").limit(limit).execute()
            
            for match in exact_matches.data or []:
                suggestions.append({
                    "ingredient": match,
                    "confidence": 1.0,
                    "match_type": "exact"
                })
            
            # If we have fewer than limit results, add semantic matches
            if len(suggestions) < limit:
                remaining_limit = limit - len(suggestions)
                semantic_matches = self.find_similar_ingredients(
                    partial_name, 
                    similarity_threshold=0.6, 
                    limit=remaining_limit
                )
                
                # Avoid duplicates
                existing_names = {s["ingredient"]["name"] for s in suggestions}
                
                for match in semantic_matches:
                    if match["ingredient"]["name"] not in existing_names:
                        suggestions.append({
                            "ingredient": match["ingredient"],
                            "confidence": match["similarity"],
                            "match_type": "semantic"
                        })
            
            # Sort by confidence (exact matches first, then by similarity)
            suggestions.sort(key=lambda x: (x["match_type"] == "exact", x["confidence"]), reverse=True)
            
            return suggestions[:limit]
            
        except Exception as e:
            logging.error(f"Error in get_ingredient_suggestions for '{partial_name}': {e}")
            return []

# Global service instance
embedding_service = IngredientEmbeddingService()

def get_embedding_service() -> IngredientEmbeddingService:
    """Get the global embedding service instance."""
    return embedding_service