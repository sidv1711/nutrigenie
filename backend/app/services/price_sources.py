from abc import ABC, abstractmethod
from typing import Optional, List

class PriceSource(ABC):
    """Abstract base for a retailer-specific price lookup implementation."""

    @abstractmethod
    def fetch_price(
        self,
        store_external_id: str,
        ingredient_name: str,
        unit: str,
    ) -> Optional[float]:
        """Return price_per_unit in USD or None if not found."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """A short identifier (e.g. 'kroger_api') stored for debugging."""
        ... 