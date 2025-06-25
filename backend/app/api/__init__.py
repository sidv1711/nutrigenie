"""
API routes for NutriGenie backend.
"""

from .auth import router as auth_router
from .profiles import router as profiles_router
from .macros import router as macros_router
from .endpoints.meal_plans import router as meal_plans_router 