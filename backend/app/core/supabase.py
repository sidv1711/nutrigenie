from supabase import create_client, Client
from .config import settings

def get_supabase() -> Client:
    """Create a Supabase client instance."""
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )

def get_supabase_admin() -> Client:
    """Create a Supabase client instance with admin privileges."""
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY
    ) 