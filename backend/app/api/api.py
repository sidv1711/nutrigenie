from fastapi import APIRouter
from .endpoints import auth, users, meal_plans, grocery, cart

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["meal-plans"])
api_router.include_router(grocery.router, prefix="/grocery", tags=["grocery"])
api_router.include_router(cart.router, prefix="/cart", tags=["cart"]) 