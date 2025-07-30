"""
API endpoints for ingredient management and semantic search.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from ...models.schema import User
from ...core.auth import get_current_user
from ...services.embeddings import get_embedding_service

router = APIRouter(prefix="/ingredients", tags=["ingredients"])

@router.get("/search")
async def search_ingredients(
    query: str = Query(..., description="Ingredient name to search for"),
    limit: int = Query(5, description="Maximum number of results"),
    similarity_threshold: float = Query(0.7, description="Minimum similarity threshold"),
    current_user: User = Depends(get_current_user)
):
    """Search for ingredients using semantic similarity."""
    try:
        embedding_service = get_embedding_service()
        results = embedding_service.find_similar_ingredients(
            query=query,
            similarity_threshold=similarity_threshold,
            limit=limit
        )
        
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/suggestions")
async def get_ingredient_suggestions(
    partial_name: str = Query(..., description="Partial ingredient name"),
    limit: int = Query(5, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user)
):
    """Get ingredient suggestions based on partial name."""
    try:
        embedding_service = get_embedding_service()
        suggestions = embedding_service.get_ingredient_suggestions(
            partial_name=partial_name,
            limit=limit
        )
        
        return {
            "partial_name": partial_name,
            "suggestions": suggestions,
            "count": len(suggestions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@router.post("/embed")
async def embed_ingredient(
    ingredient_name: str,
    current_user: User = Depends(get_current_user)
):
    """Generate and store embedding for a single ingredient."""
    try:
        embedding_service = get_embedding_service()
        ingredient_id = embedding_service.embed_ingredient(ingredient_name)
        
        if ingredient_id:
            return {
                "ingredient_name": ingredient_name,
                "ingredient_id": ingredient_id,
                "status": "success"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to generate embedding")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@router.post("/embed/batch")
async def embed_ingredients_batch(
    ingredient_names: List[str],
    current_user: User = Depends(get_current_user)
):
    """Generate and store embeddings for multiple ingredients."""
    try:
        embedding_service = get_embedding_service()
        results = embedding_service.batch_embed_ingredients(ingredient_names)
        
        successful = sum(1 for v in results.values() if v is not None)
        failed = len(results) - successful
        
        return {
            "total_processed": len(ingredient_names),
            "successful": successful,
            "failed": failed,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")

@router.get("/stats")
async def get_ingredient_stats(current_user: User = Depends(get_current_user)):
    """Get statistics about ingredients and embeddings."""
    try:
        embedding_service = get_embedding_service()
        
        # Get total ingredients
        total_result = embedding_service.supabase.table("ingredients").select("id", count="exact").execute()
        total_ingredients = total_result.count or 0
        
        # Get ingredients with embeddings
        embedded_result = embedding_service.supabase.table("ingredients").select("id", count="exact").not_.is_("embedding", "null").execute()
        embedded_ingredients = embedded_result.count or 0
        
        # Get ingredients by category
        category_result = embedding_service.supabase.table("ingredients").select("category", count="exact").execute()
        categories = {}
        for item in category_result.data or []:
            category = item.get("category", "unknown")
            categories[category] = categories.get(category, 0) + 1
        
        return {
            "total_ingredients": total_ingredients,
            "embedded_ingredients": embedded_ingredients,
            "embedding_coverage": embedded_ingredients / total_ingredients if total_ingredients > 0 else 0,
            "categories": categories
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")