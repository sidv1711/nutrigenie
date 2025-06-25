from fastapi import APIRouter, Depends, HTTPException
from ...services.geo import get_lat_lon, nearby_grocery_stores
from ...core.supabase import get_supabase_admin
from ...core.auth import get_current_user
from ...models.schema import User
import math

router = APIRouter(prefix="/stores", tags=["stores"])

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@router.get("/nearby")
async def get_nearby_stores(zip: str, current_user: User = Depends(get_current_user)):
    """Return grocery stores within 5 km of the given ZIP. Upserts rows to the stores table."""
    try:
        lat, lon = await get_lat_lon(zip)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        places = await nearby_grocery_stores(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    supabase = get_supabase_admin()
    results = []
    for p in places:
        place_id = p["place_id"]
        name = p["name"]
        loc = p["geometry"]["location"]
        store_lat, store_lon = loc["lat"], loc["lng"]
        distance_km = haversine(lat, lon, store_lat, store_lon)

        # upsert
        supabase.table("stores").upsert({
            "place_id": place_id,
            "name": name,
            "lat": store_lat,
            "lon": store_lon,
        }, on_conflict="place_id").execute()

        results.append({
            "place_id": place_id,
            "name": name,
            "distance_km": round(distance_km, 2),
        })
    return {"stores": results} 