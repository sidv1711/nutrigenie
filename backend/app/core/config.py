from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    API_ENV: str = "development"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # OpenAI (for later)
    OPENAI_API_KEY: str = ""
    
    # Google APIs
    GOOGLE_API_KEY: str = ""
    
    # Always load env file located at the backend root, regardless of cwd
    _env_path = Path(__file__).resolve().parents[2] / ".env"  # <repo>/backend/.env
    model_config = SettingsConfigDict(env_file=str(_env_path), case_sensitive=True, extra="ignore")

settings = Settings() 