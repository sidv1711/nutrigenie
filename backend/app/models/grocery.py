from pydantic import BaseModel, Field
from typing import Optional

class GroceryItem(BaseModel):
    name: str
    unit: str
    quantity: float = Field(..., ge=0)
    price_per_unit: Optional[float] = None
    cost: Optional[float] = None
    store_place_id: Optional[str] = None

class GroceryListResponse(BaseModel):
    plan_id: str
    items: list[GroceryItem]
    total_cost: Optional[float] = None 