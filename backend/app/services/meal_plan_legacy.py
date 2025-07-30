from datetime import date, timedelta
from typing import List, Dict, Any, Optional
import json
from openai import OpenAI
from ..models.meal_plan import MealPlan, MealPlanRequest, Recipe, Ingredient
from ..core.config import settings
from ..core.supabase import get_supabase_admin
import logging, traceback
from .pricing import get_price_per_unit

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def get_meal_plan_functions() -> List[Dict[str, Any]]:
    return [
        {
            "name": "create_meal_plan",
            "description": "Create a budget-conscious meal plan that meets the user's nutritional, dietary, and budget requirements",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "day_of_week": {
                                    "type": "integer",
                                    "description": "Day of week (0-6, where 0 is Monday)",
                                    "minimum": 0,
                                    "maximum": 6
                                },
                                "meals": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "meal_type": {
                                                "type": "string",
                                                "enum": ["breakfast", "lunch", "dinner", "snack"],
                                                "description": "Type of meal"
                                            },
                                            "recipe": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string",
                                                        "description": "Name of the recipe"
                                                    },
                                                    "description": {
                                                        "type": "string",
                                                        "description": "Brief description of the recipe"
                                                    },
                                                    "instructions": {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "string"
                                                        },
                                                        "description": "Step-by-step cooking instructions"
                                                    },
                                                    "prep_time_minutes": {
                                                        "type": "integer",
                                                        "description": "Preparation time in minutes"
                                                    },
                                                    "cook_time_minutes": {
                                                        "type": "integer",
                                                        "description": "Cooking time in minutes"
                                                    },
                                                    "servings": {
                                                        "type": "integer",
                                                        "description": "Number of servings the recipe makes"
                                                    },
                                                    "calories_per_serving": {
                                                        "type": "integer",
                                                        "description": "Calories per serving"
                                                    },
                                                    "protein_per_serving": {
                                                        "type": "number",
                                                        "description": "Protein per serving in grams"
                                                    },
                                                    "carbs_per_serving": {
                                                        "type": "number",
                                                        "description": "Carbs per serving in grams"
                                                    },
                                                    "fat_per_serving": {
                                                        "type": "number",
                                                        "description": "Fat per serving in grams"
                                                    },
                                                    "ingredients": {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "name": {
                                                                    "type": "string",
                                                                    "description": "Name of the ingredient"
                                                                },
                                                                "category": {
                                                                    "type": "string",
                                                                    "description": "Category of the ingredient (e.g., 'produce', 'dairy', 'meat')"
                                                                },
                                                                "unit": {
                                                                    "type": "string",
                                                                    "description": "Unit of measurement (e.g., 'g', 'ml', 'cup')"
                                                                },
                                                                "quantity": {
                                                                    "type": "number",
                                                                    "description": "Quantity needed for the recipe"
                                                                },
                                                                "price_per_unit": {
                                                                    "type": "number",
                                                                    "description": "Estimated price per unit in dollars"
                                                                }
                                                            },
                                                            "required": ["name", "category", "unit", "quantity", "price_per_unit"]
                                                        }
                                                    },
                                                    "dietary_tags": {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "string"
                                                        },
                                                        "description": "Dietary tags (e.g., 'vegetarian', 'gluten-free')"
                                                    }
                                                },
                                                "required": [
                                                    "name", "instructions", "prep_time_minutes", "cook_time_minutes",
                                                    "servings", "calories_per_serving", "protein_per_serving",
                                                    "carbs_per_serving", "fat_per_serving", "ingredients"
                                                ]
                                            },
                                            "servings": {
                                                "type": "integer",
                                                "description": "Number of servings to make"
                                            }
                                        },
                                        "required": ["meal_type", "recipe", "servings"]
                                    }
                                }
                            },
                            "required": ["day_of_week", "meals"]
                        }
                    },
                    "total_cost": {
                        "type": "number",
                        "description": "Total estimated cost of all ingredients - MUST be within the specified weekly budget"
                    }
                },
                "required": ["days", "total_cost"]
            }
        }
    ]

def generate_meal_plan(request: MealPlanRequest, user_id: str):
    # Calculate number of days
    days_diff = (request.end_date - request.start_date).days + 1
    
    supabase = get_supabase_admin()
    availability_line = f"Uses ingredients available in stores near {request.location_zip}"
    if request.store_place_ids:
        store_names: list[str] = []
        try:
            name_res = supabase.table("stores").select("name").in_("place_id", request.store_place_ids).execute()
            store_names = [row["name"] for row in (name_res.data or []) if row.get("name")]
        except Exception:
            pass  # fallback to default line if lookup fails
        if store_names:
            availability_line = f"Prefer ingredients stocked by: {', '.join(store_names)}"

    # Create the system prompt
    system_prompt = f"""You are a nutrition expert and meal planning assistant. Create a meal plan that:
1. Meets the daily nutritional requirements:
   - Calories: {request.calories_per_day} kcal
   - Protein: {request.protein_per_day}g
   - Carbs: {request.carbs_per_day}g
   - Fat: {request.fat_per_day}g
2. Stays within the weekly budget of ${request.weekly_budget}
3. Accommodates dietary restrictions: {', '.join(request.dietary_restrictions) if request.dietary_restrictions else 'None'}
4. Provides variety and balanced nutrition
5. {availability_line}
6. Minimizes meal prep time (aim for ≤ 30 minutes per day)

The meal plan should cover {days_diff} days from {request.start_date} to {request.end_date}.
Each day should include breakfast, lunch, dinner, and optional snacks.
Ensure recipes are simple, healthy, and budget-friendly."""

    # Log prompt for debugging
    logging.info("GPT prompt (meal-plan generation):\n%s", system_prompt)

    # Call OpenAI with function calling
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Please create a meal plan that meets these requirements."}
        ],
        functions=get_meal_plan_functions(),
        function_call={"name": "create_meal_plan"}
    )

    # Parse the function call response
    function_call = response.choices[0].message.function_call
    if not function_call or function_call.name != "create_meal_plan":
        raise ValueError("Failed to generate meal plan")

    meal_plan_data = json.loads(function_call.arguments)
    
    # Basic validation logging
    days_generated = len(meal_plan_data.get('days', []))
    if days_generated != days_diff:
        logging.warning(f"Legacy service: generated {days_generated} days, expected {days_diff}")
    
    # Convert to MealPlan model
    plan = MealPlan(
        start_date=request.start_date,
        end_date=request.end_date,
        days=meal_plan_data["days"],
        total_cost=meal_plan_data["total_cost"]
    )

    # ---------------- price augmentation ----------------
    store_ids = request.store_place_ids or []

    grand_total = 0.0
    for day in plan.days:
        for meal in day.meals:
            for ing in meal.recipe.ingredients:
                price_unit = get_price_per_unit(store_ids, ing.name, ing.unit)
                ing.price_per_unit = price_unit
                grand_total += price_unit * ing.quantity

    plan.total_cost = round(grand_total, 2)

    plan_id: Optional[str] = None  # default in case DB insert fails

    # Persist high-level row to Supabase
    try:
        insert_res = supabase.table("meal_plans").insert({
            "user_id": user_id,
            "start_date": plan.start_date.isoformat(),
            "end_date": plan.end_date.isoformat(),
            "total_cost": plan.total_cost,
        }).execute()

        if insert_res.data:
            plan_id = insert_res.data[0]["id"]
            # -------- Batch inserts to reduce round-trips --------
            recipe_id_cache: dict[str, str] = {}
            ingredient_id_cache: dict[str, str | None] = {}
            bulk_ingredients: list[dict] = []
            bulk_links: list[dict] = []

            for day in plan.days:
                for meal in day.meals:
                    r = meal.recipe
                    key = r.name.lower()
                    if key in recipe_id_cache:
                        recipe_id = recipe_id_cache[key]
                    else:
                        recipe_insert = supabase.table("recipes").upsert({
                            "name": r.name,
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
                        recipe_id = recipe_insert.data[0]["id"]
                        recipe_id_cache[key] = recipe_id

                    # Insert meal-plan link immediately (still one per meal)
                    supabase.table("meal_plan_recipes").insert({
                        "meal_plan_id": plan_id,
                        "recipe_id": recipe_id,
                        "meal_type": meal.meal_type,
                        "day_of_week": day.day_of_week,
                        "servings": meal.servings,
                    }).execute()

                    # Collect ingredient data for batching
                    for ing in r.ingredients:
                        ikey = ing.name.lower()
                        if ikey not in ingredient_id_cache:
                            bulk_ingredients.append({
                                "name": ing.name,
                                "category": ing.category,
                                "unit": ing.unit,
                                "price_per_unit": ing.price_per_unit,
                            })
                            ingredient_id_cache[ikey] = None  # placeholder

                        bulk_links.append({
                            "recipe_id": recipe_id,
                            "ingredient_name": ing.name,  # temp field to resolve later
                            "quantity": ing.quantity,
                            "unit": ing.unit,
                        })

            # ----- execute batched ingredient upsert -----
            if bulk_ingredients:
                names = [row["name"] for row in bulk_ingredients]
                supabase.table("ingredients").upsert(bulk_ingredients, on_conflict="name").execute()

                # fetch ids for these names
                fetched = supabase.table("ingredients").select("id,name").in_("name", names).execute()
                for row in fetched.data or []:
                    ingredient_id_cache[row["name"].lower()] = row["id"]

            # resolve ingredient ids in links
            resolved_links: list[dict] = []
            for link in bulk_links:
                ing_id = ingredient_id_cache.get(link["ingredient_name"].lower())
                if not ing_id:
                    continue  # should not happen
                resolved_links.append({
                    "recipe_id": link["recipe_id"],
                    "ingredient_id": ing_id,
                    "quantity": link["quantity"],
                    "unit": link["unit"],
                })

            if resolved_links:
                # Use insert instead of upsert since there's no unique constraint
                try:
                    supabase.table("recipe_ingredients").insert(resolved_links).execute()
                except Exception as e:
                    print(f"Warning: Failed to insert recipe ingredients: {e}")
                    # Continue without failing the entire meal plan generation

            # ------------- link plan to chosen stores -------------
            if request.store_place_ids and plan_id:
                for pid in request.store_place_ids:
                    supabase.table("meal_plan_stores").upsert({
                        "meal_plan_id": plan_id,
                        "place_id": pid,
                    }, on_conflict="meal_plan_id,place_id").execute()
    except Exception as e:
        logging.error("Supabase DB write failed:\n%s", traceback.format_exc())
        raise

    return plan, plan_id 