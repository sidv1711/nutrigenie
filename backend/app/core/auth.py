from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..core.supabase import get_supabase
from ..models.schema import User

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Return the authenticated Supabase user as our internal User model."""
    supabase = get_supabase()
    # Fetch user info directly from the JWT instead of attempting to set a full session
    user_response = supabase.auth.get_user(credentials.credentials)
    # supabase-py returns an object with a .user attribute – fall back to raw object if lib version differs
    user_data = getattr(user_response, "user", user_response)
    if user_data is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = user_data
    full_name_val = user.user_metadata.get("full_name") if hasattr(user, "user_metadata") else None
    if not full_name_val:
        full_name_val = user.email.split("@")[0]
    return User(
        id=user.id,
        email=user.email,
        full_name=full_name_val,
        created_at=user.created_at,
    ) 