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
}

_SPECIAL_UNITS = {"each"}  # cannot convert – assume identical


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

    # Weight
    if f in _BASE_WEIGHTS_G and t in _BASE_WEIGHTS_G:
        ratio = _BASE_WEIGHTS_G[f] / _BASE_WEIGHTS_G[t]
        return price * ratio

    # Volume
    if f in _BASE_VOLUMES_ML and t in _BASE_VOLUMES_ML:
        ratio = _BASE_VOLUMES_ML[f] / _BASE_VOLUMES_ML[t]
        return price * ratio

    # Unknown conversion – return None to signal caller to ignore.
    return None 