import httpx
from ..core.config import settings

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

async def get_lat_lon(zip_code: str) -> tuple[float, float]:
    """Return (lat, lon) for a US ZIP code using Google Geocoding API."""
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not configured in environment")

    params = {"address": zip_code, "key": settings.GOOGLE_API_KEY, "components": "country:US"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(GOOGLE_GEOCODE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") != "OK":
        raise RuntimeError(f"Geocoding failed: {data.get('status')} – {data.get('error_message')}")
    loc = data["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"]

async def nearby_grocery_stores(lat: float, lon: float, radius_m: int = 5000):
    """Return list of nearby grocery stores from Google Places."""
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not configured")
    params = {
        "location": f"{lat},{lon}",
        "radius": radius_m,
        "type": "grocery_or_supermarket",
        "key": settings.GOOGLE_API_KEY,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(GOOGLE_PLACES_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise RuntimeError(f"Places API error: {data.get('status')}")
    return data.get("results", []) 