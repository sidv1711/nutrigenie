from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth_router, profiles_router, macros_router, meal_plans_router
from .core.config import settings
from .api.endpoints import stores

app = FastAPI(
    title="NutriGenie API",
    description="Backend API for NutriGenie - AI-powered budget nutrition planning",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex="http://localhost:\\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(macros_router)
app.include_router(meal_plans_router)
app.include_router(stores.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "NutriGenie API is running"}
