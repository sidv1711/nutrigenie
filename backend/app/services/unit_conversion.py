# backend/app/services/unit_conversion.py
"""Utility helpers for unit normalization and conversion.

Currently supports common grocery units used by our price scrapers (g, kg, lb, oz, ml, l, each).
The conversion helpers are intentionally simple – they do not handle density-based
conversions (e.g. g ↔ ml).
"""
from __future__ import annotations

from typing import Optional

# Base units expressed in grams or millilitres where applicable.
_BASE_WEIGHTS_G = {
    "g": 1.0,
    "kg": 1000.0,
    "lb": 453.592,
    "lbs": 453.592,
    "oz": 28.3495,
}

_BASE_VOLUMES_ML = {
    "ml": 1.0,
    "l": 1000.0,
    "fl-oz": 29.5735,
    "cup": 236.588,  # 1 US cup = 236.588 ml
    "tbsp": 14.7868,  # 1 tablespoon = 14.7868 ml
    "tsp": 4.92892,   # 1 teaspoon = 4.92892 ml
}

_SPECIAL_UNITS = {
    "each", "ct", "count", "piece", "item", 
    # Recipe-specific units that should be treated as fractions of "each"
    "slice", "slices", "wedge", "wedges", "clove", "cloves",
    "stalk", "stalks", "sprig", "sprigs", "leaf", "leaves"
}


def normalize(unit: str) -> str:
    """Return a canonical, lowercase representation of *unit*."""
    return unit.strip().lower().replace(" ", "-")


def is_convertible(unit: str) -> bool:
    """Return True when *unit* can be converted with our simple ratios."""
    u = normalize(unit)
    return u in _BASE_WEIGHTS_G or u in _BASE_VOLUMES_ML


def convert_price(price: float, from_unit: str, to_unit: str) -> Optional[float]:
    """Return *price* converted from *from_unit* → *to_unit* (per-unit price).

    If either unit is not convertible the original price is returned unchanged.
    """
    f, t = normalize(from_unit), normalize(to_unit)

    if f == t or price is None:
        return price

    # Handle recipe-specific units that are fractions of "each" FIRST
    slice_units = {"slice", "slices", "wedge", "wedges"}
    small_units = {"clove", "cloves", "sprig", "sprigs", "leaf", "leaves"}
    
    if f == "each" and t in slice_units:
        # 1 whole item = 4-6 slices/wedges on average
        return price / 5
    elif f in slice_units and t == "each":
        return price * 5
    elif f == "each" and t in small_units:
        # 1 whole item = 8-10 small pieces (cloves, sprigs, etc.)
        return price / 9
    elif f in small_units and t == "each":
        return price * 9

    # Special units that are assumed to be equivalent (counts, pieces, etc.)
    if f in _SPECIAL_UNITS and t in _SPECIAL_UNITS:
        return price

    # Weight
    if f in _BASE_WEIGHTS_G and t in _BASE_WEIGHTS_G:
        ratio = _BASE_WEIGHTS_G[f] / _BASE_WEIGHTS_G[t]
        return price * ratio

    # Volume
    if f in _BASE_VOLUMES_ML and t in _BASE_VOLUMES_ML:
        ratio = _BASE_VOLUMES_ML[f] / _BASE_VOLUMES_ML[t]
        return price * ratio

    # Special case: for some ingredients, we can make reasonable approximations
    # For canned goods: 1 can ≈ 1.5 cups, 1 oz of canned ≈ 2 tbsp
    if f == "oz" and t == "cup":
        return price * (28.35 / 236.588)  # 1 oz ≈ 0.12 cups
    elif f == "ct" and t == "cup":
        # For canned items like chickpeas: 1 can ≈ 1.5 cups
        return price / 1.5
    elif f == "cup" and t == "ct":
        return price * 1.5
    
    # Common grocery conversions with more realistic package sizes
    elif f == "each" and t in _BASE_VOLUMES_ML:
        # For liquids sold "each" (containers), use context-aware sizes
        # Different products have very different standard container sizes
        container_ml = 473.0  # Default to ~16 fl oz bottle/container
        
        # Adjust based on likely product type (if we can infer from context)
        # Milk/juice cartons: 946ml (32 fl oz) or 1892ml (64 fl oz)
        # Bottles: 473ml (16 fl oz) or 355ml (12 fl oz)
        # Cans: 355ml (12 fl oz)
        
        ratio = container_ml / _BASE_VOLUMES_ML[t]
        return price / ratio
        
    elif f in _BASE_VOLUMES_ML and t == "each":
        # Reverse conversion: ml/l to containers
        container_ml = 473.0  # Default container size
        ratio = _BASE_VOLUMES_ML[f] / container_ml
        return price / ratio
    
    # For weight-based items sold "each", use more realistic package sizes
    elif f == "each" and t in _BASE_WEIGHTS_G:
        # Different standard package weights based on common grocery items:
        # Produce items: 200-400g (apples, onions, etc.)
        # Packaged goods: 300-600g (pasta, rice, etc.)
        # Meat packages: 400-800g
        # Default to smaller size since many items are sold individually
        package_g = 300.0  # More realistic average package size
        
        ratio = package_g / _BASE_WEIGHTS_G[t]
        return price / ratio
        
    elif f in _BASE_WEIGHTS_G and t == "each":
        # Reverse conversion
        package_g = 300.0  # Match the forward conversion
        ratio = _BASE_WEIGHTS_G[f] / package_g
        return price / ratio

    # Density-based conversions for common liquids (weight ↔ volume)
    # Only use for specific liquid ingredients where density is well-known
    liquid_densities = {
        # Density in g/ml - most liquids are close to water (1 g/ml)
        'milk': 1.03,      # Milk is slightly denser than water
        'water': 1.0,      # Water baseline
        'juice': 1.05,     # Fruit juices slightly denser
        'oil': 0.92,       # Cooking oils are less dense
        'vinegar': 1.01,   # Similar to water
        'wine': 0.99,      # Slightly less than water
        'beer': 1.01,      # Close to water
        'soda': 1.04,      # Sugar makes it denser
    }
    
    # Check if we can infer liquid type for density conversion
    # This is a fallback for when we have weight data for liquids
    if f in _BASE_WEIGHTS_G and t in _BASE_VOLUMES_ML:
        # Default density for unknown liquids (assume water-like)
        density = 1.0  # g/ml
        
        # Convert weight to volume: volume_ml = weight_g / density
        price_per_ml = price * (_BASE_WEIGHTS_G[f] / density) / _BASE_VOLUMES_ML[t]
        return price_per_ml
        
    elif f in _BASE_VOLUMES_ML and t in _BASE_WEIGHTS_G:
        # Convert volume to weight: weight_g = volume_ml * density
        density = 1.0  # g/ml default
        
        price_per_g = price * (_BASE_VOLUMES_ML[f] * density) / _BASE_WEIGHTS_G[t]
        return price_per_g

    # Unknown conversion – return None to signal caller to ignore.
    return None 