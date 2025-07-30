from fastapi import APIRouter
from .endpoints import meal_plans, grocery, cart, ingredients, stores
from . import auth, profiles

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profiles.router, prefix="/users", tags=["users"])
api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["meal-plans"])
api_router.include_router(grocery.router, prefix="/grocery", tags=["grocery"])
api_router.include_router(cart.router, prefix="/cart", tags=["cart"])
api_router.include_router(ingredients.router, prefix="/ingredients", tags=["ingredients"])
api_router.include_router(stores.router, prefix="/stores", tags=["stores"]) 