"""
RAG-enhanced meal planning service that uses semantic ingredient matching
to improve recipe generation and ingredient availability.
"""

import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
import json
from ..models.meal_plan import MealPlan, MealPlanRequest
from ..core.config import settings
from ..core.supabase import get_supabase_admin
from .embeddings import get_embedding_service
from .pricing import get_price_per_unit

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class RAGMealPlanService:
    """Enhanced meal planning service with RAG capabilities."""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.supabase = get_supabase_admin()
    
    def get_available_ingredients(self, store_place_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Get available ingredients from selected stores.
        
        Args:
            store_place_ids: List of store place IDs
            
        Returns:
            List of available ingredients with details
        """
        try:
            # Get ingredients that have price data for the selected stores
            result = self.supabase.table("ingredients").select(
                "id, name, category, unit, embedding"
            ).execute()
            
            # Check if the result has data (newer Supabase versions don't have .error attribute)
            if not result.data:
                logging.error("No ingredients data returned from database")
                return []
            
            # Filter ingredients that have pricing data
            available_ingredients = []
            for ingredient in result.data or []:
                # Check if this ingredient has price data
                price = get_price_per_unit(store_place_ids, ingredient["name"], ingredient["unit"])
                if price is not None:
                    available_ingredients.append({
                        **ingredient,
                        "current_price": price
                    })
            
            return available_ingredients
            
        except Exception as e:
            logging.error(f"Error getting available ingredients: {e}")
            return []
    
    def enhance_ingredient_list(self, raw_ingredients: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enhance a list of ingredients using semantic matching to find available alternatives.
        
        Args:
            raw_ingredients: List of ingredients from GPT generation
            
        Returns:
            Enhanced ingredient list with availability and alternatives
        """
        enhanced_ingredients = []
        
        for ingredient in raw_ingredients:
            # Handle both dict and Pydantic object
            if hasattr(ingredient, 'dict'):
                # Pydantic object
                ingredient_dict = ingredient.dict()
                ingredient_name = ingredient.name
            else:
                # Dictionary
                ingredient_dict = ingredient
                ingredient_name = ingredient.get('name', '')
            
            if not ingredient_name:
                continue
            
            try:
                # First, try to find exact match
                exact_match = self.supabase.table("ingredients").select("*").eq("name", ingredient_name.lower()).execute()
                
                if exact_match.data:
                    # Exact match found
                    enhanced_ingredients.append({
                        **ingredient_dict,
                        "matched_ingredient": exact_match.data[0],
                        "match_type": "exact",
                        "confidence": 1.0
                    })
                else:
                    # Use semantic search to find similar ingredients
                    similar_ingredients = self.embedding_service.find_similar_ingredients(
                        ingredient_name,
                        similarity_threshold=0.7,
                        limit=1
                    )
                    
                    if similar_ingredients:
                        best_match = similar_ingredients[0]
                        enhanced_ingredients.append({
                            **ingredient_dict,
                            "matched_ingredient": best_match["ingredient"],
                            "match_type": "semantic",
                            "confidence": best_match["similarity"],
                            "original_name": ingredient_name
                        })
                    else:
                        # No good match found, create new ingredient entry
                        ingredient_id = self.embedding_service.embed_ingredient(ingredient_name)
                        if ingredient_id:
                            new_ingredient = self.supabase.table("ingredients").select("*").eq("id", ingredient_id).execute()
                            if new_ingredient.data:
                                enhanced_ingredients.append({
                                    **ingredient_dict,
                                    "matched_ingredient": new_ingredient.data[0],
                                    "match_type": "new",
                                    "confidence": 1.0
                                })
                        else:
                            # Fallback: use original ingredient
                            enhanced_ingredients.append({
                                **ingredient_dict,
                                "match_type": "fallback",
                                "confidence": 0.5
                            })
                
            except Exception as e:
                logging.error(f"Error enhancing ingredient '{ingredient_name}': {e}")
                # Fallback: use original ingredient
                enhanced_ingredients.append({
                    **ingredient_dict,
                    "match_type": "error",
                    "confidence": 0.0
                })
        
        return enhanced_ingredients
    
    def create_context_aware_prompt(self, request: MealPlanRequest, available_ingredients: List[Dict[str, Any]]) -> str:
        """
        Create a context-aware prompt that includes available ingredients.
        
        Args:
            request: Meal plan request
            available_ingredients: List of available ingredients
            
        Returns:
            Enhanced prompt string
        """
        # Calculate number of days and budget
        days_diff = (request.end_date - request.start_date).days + 1
        daily_budget = request.weekly_budget / 7
        
        # Get store information
        store_names = []
        if request.store_place_ids:
            try:
                name_res = self.supabase.table("stores").select("name").in_("place_id", request.store_place_ids).execute()
                store_names = [row["name"] for row in (name_res.data or []) if row.get("name")]
            except Exception:
                pass
        
        availability_line = f"Uses ingredients available in stores near {request.location_zip}"
        if store_names:
            availability_line = f"Prefer ingredients stocked by: {', '.join(store_names)}"
        
        # Simplified ingredient context to reduce tokens
        budget_ingredients = []
        for ingredient in available_ingredients[:20]:  # Limit to top 20
            price = ingredient.get("current_price", 0.0)
            if price < 2.0:  # Focus on budget-friendly ingredients
                budget_ingredients.append(f"{ingredient['name']} (${price:.2f})")
        
        ingredient_context = ""
        if budget_ingredients:
            ingredient_context = f"\n\nBUDGET-FRIENDLY INGREDIENTS AVAILABLE:\n"
            ingredient_context += f"Daily budget: ${daily_budget:.2f}\n"
            ingredient_context += ", ".join(budget_ingredients[:15])  # Limit to 15 items
        
        prompt = f"""Create a {days_diff}-day meal plan. 

JSON STRUCTURE REQUIRED:
{{
  "days": [
    {{ "day_of_week": 0, "meals": [breakfast, lunch, dinner] }},
    {{ "day_of_week": 1, "meals": [breakfast, lunch, dinner] }},
    ... {days_diff} days total
  ],
  "total_cost": number
}}

REQUIREMENTS:
- Exactly {days_diff} days (days array length = {days_diff})
- Each day has exactly 3 meals (breakfast, lunch, dinner)
- Budget: ${request.weekly_budget:.2f} total
- Nutrition per day: {request.calories_per_day} kcal, {request.protein_per_day}g protein
- day_of_week: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

{ingredient_context}

CRITICAL: Array "days" must have {days_diff} elements, each with 3 meals."""

        return prompt
    
    def generate_rag_enhanced_meal_plan(self, request: MealPlanRequest, user_id: str) -> tuple[MealPlan, Optional[str]]:
        """
        Generate a meal plan using RAG-enhanced ingredient matching.
        
        Args:
            request: Meal plan request
            user_id: User ID
            
        Returns:
            Tuple of (MealPlan, plan_id)
        """
        try:
            # Temporarily disable ingredient fetching to debug timeout
            available_ingredients = []
            logging.info("Temporarily disabled ingredient fetching to debug timeout")
            
            # Create context-aware prompt
            system_prompt = self.create_context_aware_prompt(request, available_ingredients)
            
            # Log basic generation info
            logging.info(f"Generating {days_diff}-day meal plan with budget ${request.weekly_budget}")
            
            # Get meal plan functions (reuse from legacy service)
            from .meal_plan_legacy import get_meal_plan_functions
            
            # Call OpenAI with enhanced prompt
            logging.info("Calling OpenAI API for meal plan generation...")
            
            # Calculate expected days for clearer instruction
            days_diff = (request.end_date - request.start_date).days + 1
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            expected_days = [day_names[i % 7] for i in range(days_diff)]
            
            user_message = f"""Generate exactly {days_diff} days: {', '.join(expected_days)}.

CRITICAL: Each day must have exactly 3 meals - breakfast, lunch, AND dinner.

Return JSON with "days" array containing {days_diff} elements. Each day needs:
- day_of_week: 0-6 (0=Mon, 1=Tue, etc.)  
- meals: [breakfast, lunch, dinner] - ALWAYS 3 meals per day

Verify each day has 3 meals before returning."""

            response = client.chat.completions.create(
                model="gpt-4o",  # More capable model for complex function calls
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                functions=get_meal_plan_functions(),
                function_call={"name": "create_meal_plan"},
                timeout=180  # Increased timeout to allow completion
            )
            logging.info("OpenAI API call completed")
            
            # Parse the function call response
            function_call = response.choices[0].message.function_call
            if not function_call or function_call.name != "create_meal_plan":
                raise ValueError("Failed to generate meal plan")
            
            meal_plan_data = json.loads(function_call.arguments)
            
            # Validate the generated plan
            days_count = len(meal_plan_data.get('days', []))
            if days_count != days_diff:
                logging.warning(f"GPT generated {days_count} days but requested {days_diff} days")
            
            # Check that each day has 3 meals - reject if malformed
            malformed = False
            for i, day in enumerate(meal_plan_data.get('days', [])):
                meal_count = len(day.get('meals', []))
                if meal_count != 3:
                    logging.warning(f"Day {i} has {meal_count} meals instead of 3")
                    malformed = True
            
            # If GPT generated a malformed response, raise an error
            if days_count != days_diff or malformed:
                raise ValueError(f"Generated meal plan validation failed: {days_count} days, some with incorrect meal counts")
            
            # Create meal plan object
            plan = MealPlan(
                start_date=request.start_date,
                end_date=request.end_date,
                days=meal_plan_data["days"],
                total_cost=meal_plan_data["total_cost"]
            )
            
            # Enhance ingredients with semantic matching
            for day in plan.days:
                for meal in day.meals:
                    enhanced_ingredients = self.enhance_ingredient_list(meal.recipe.ingredients)
                    
                    # Update ingredients with enhanced data and real pricing
                    updated_ingredients = []
                    for enhanced_ingredient in enhanced_ingredients:
                        # Clean ingredient data to match Pydantic model - only keep expected fields
                        clean_ingredient = {
                            "name": str(enhanced_ingredient.get("name", "")),
                            "category": str(enhanced_ingredient.get("category", "general")),
                            "unit": str(enhanced_ingredient.get("unit", "unit")),
                            "quantity": float(enhanced_ingredient.get("quantity", 1.0)),
                            "price_per_unit": float(enhanced_ingredient.get("price_per_unit", 0.0))
                        }
                        
                        # Use matched ingredient name if available
                        if "matched_ingredient" in enhanced_ingredient:
                            matched = enhanced_ingredient["matched_ingredient"]
                            clean_ingredient["name"] = matched["name"]
                            clean_ingredient["category"] = matched.get("category", "general")
                            clean_ingredient["unit"] = enhanced_ingredient.get("unit", matched.get("unit", "unit"))
                            
                            # Get real price
                            real_price = get_price_per_unit(
                                request.store_place_ids or [], 
                                matched["name"], 
                                clean_ingredient["unit"]
                            )
                            if real_price is not None:
                                clean_ingredient["price_per_unit"] = real_price
                        
                        updated_ingredients.append(clean_ingredient)
                    
                    meal.recipe.ingredients = updated_ingredients
            
            # Recalculate total cost with enhanced pricing
            grand_total = 0.0
            ingredient_costs = []
            
            for day in plan.days:
                for meal in day.meals:
                    for ing in meal.recipe.ingredients:
                        if "price_per_unit" in ing and "quantity" in ing:
                            cost = ing["price_per_unit"] * ing["quantity"]
                            grand_total += cost
                            ingredient_costs.append(f"{ing['name']}: ${ing['price_per_unit']:.4f} × {ing['quantity']} = ${cost:.2f}")
            
            # Use GPT's original cost estimate if recalculated cost seems wrong
            gpt_cost = meal_plan_data.get('total_cost', 0)
            if grand_total > gpt_cost * 3 or grand_total < gpt_cost * 0.5:  # Too high or too low
                logging.info(f"Using GPT cost estimate ${gpt_cost} instead of recalculated ${grand_total:.2f}")
                plan.total_cost = gpt_cost
            else:
                plan.total_cost = round(grand_total, 2)
            
            # Save to database (reuse logic from legacy service)
            from .meal_plan_legacy import generate_meal_plan
            
            # Use the original persistence logic but with our enhanced plan
            plan_id = self._persist_meal_plan(plan, user_id, request)
            
            logging.info(f"RAG-enhanced meal plan generated with total cost: ${plan.total_cost}")
            return plan, plan_id
            
        except Exception as e:
            logging.error(f"Error in generate_rag_enhanced_meal_plan: {e}")
            # No fallback - let the error bubble up to see what's happening
            raise e
    
    def _persist_meal_plan(self, plan: MealPlan, user_id: str, request: MealPlanRequest) -> Optional[str]:
        """
        Persist the meal plan to the database.
        
        Args:
            plan: Meal plan to persist
            user_id: User ID
            request: Original request
            
        Returns:
            Plan ID if successful
        """
        try:
            # Insert main meal plan record
            insert_res = self.supabase.table("meal_plans").insert({
                "user_id": user_id,
                "start_date": plan.start_date.isoformat(),
                "end_date": plan.end_date.isoformat(),
                "total_cost": plan.total_cost,
            }).execute()
            
            if not insert_res.data:
                return None
            
            plan_id = insert_res.data[0]["id"]
            
            # Persist recipes and ingredients
            for day in plan.days:
                for meal in day.meals:
                    r = meal.recipe
                    
                    # Insert recipe with unique name to avoid conflicts
                    unique_recipe_name = f"{r.name}_{plan_id}_{day.day_of_week}_{meal.meal_type}"
                    recipe_insert = self.supabase.table("recipes").upsert({
                        "name": unique_recipe_name,
                        "description": r.description,
                        "instructions": r.instructions,
                        "prep_time_minutes": r.prep_time_minutes,
                        "cook_time_minutes": r.cook_time_minutes,
                        "servings": r.servings,
                        "calories_per_serving": r.calories_per_serving,
                        "protein_per_serving": r.protein_per_serving,
                        "carbs_per_serving": r.carbs_per_serving,
                        "fat_per_serving": r.fat_per_serving,
                        "dietary_tags": r.dietary_tags or [],
                    }, on_conflict="name").execute()
                    
                    if not recipe_insert.data:
                        continue
                    
                    recipe_id = recipe_insert.data[0]["id"]
                    
                    # Link recipe to meal plan
                    self.supabase.table("meal_plan_recipes").insert({
                        "meal_plan_id": plan_id,
                        "recipe_id": recipe_id,
                        "meal_type": meal.meal_type,
                        "day_of_week": day.day_of_week,
                        "servings": meal.servings,
                    }).execute()
                    
                    # Process ingredients
                    for ing in r.ingredients:
                        ingredient_name = ing.get("name", "")
                        if not ingredient_name:
                            continue
                        
                        # Ensure ingredient exists (try embedding first, fallback to simple lookup)
                        ingredient_id = None
                        try:
                            # First try existing ingredient lookup (faster)
                            existing = self.supabase.table("ingredients").select("id").eq("name", ingredient_name.lower()).execute()
                            if existing.data:
                                ingredient_id = existing.data[0]["id"]
                            else:
                                # Only generate embedding for new ingredients
                                ingredient_id = self.embedding_service.embed_ingredient(ingredient_name)
                        except Exception as e:
                            logging.error(f"Error processing ingredient '{ingredient_name}': {e}")
                            # Final fallback - create ingredient without embedding
                            try:
                                result = self.supabase.table("ingredients").insert({
                                    "name": ingredient_name.lower(),
                                    "category": "general",
                                    "unit": "unit",
                                    "price_per_unit": 0.0
                                }).execute()
                                ingredient_id = result.data[0]["id"] if result.data else None
                            except:
                                pass
                        
                        if ingredient_id:
                            # Link ingredient to recipe
                            try:
                                self.supabase.table("recipe_ingredients").insert({
                                    "recipe_id": recipe_id,
                                    "ingredient_id": ingredient_id,
                                    "quantity": ing.get("quantity", 1),
                                    "unit": ing.get("unit", "unit"),
                                }).execute()
                            except Exception as e:
                                # Handle duplicate key errors gracefully
                                if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                                    logging.debug(f"Recipe ingredient already exists: {recipe_id}, {ingredient_id}")
                                else:
                                    logging.error(f"Error inserting recipe ingredient: {e}")
            
            # Link stores
            if request.store_place_ids:
                for place_id in request.store_place_ids:
                    try:
                        self.supabase.table("meal_plan_stores").insert({
                            "meal_plan_id": plan_id,
                            "place_id": place_id,
                        }).execute()
                    except Exception as e:
                        # Handle duplicate key errors gracefully
                        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                            logging.debug(f"Meal plan store already exists: {plan_id}, {place_id}")
                        else:
                            logging.error(f"Error inserting meal plan store: {e}")
            
            return plan_id
            
        except Exception as e:
            logging.error(f"Error persisting RAG meal plan: {e}")
            return None

# Global service instance
rag_meal_plan_service = RAGMealPlanService()

def get_rag_meal_plan_service() -> RAGMealPlanService:
    """Get the global RAG meal plan service instance."""
    return rag_meal_plan_service