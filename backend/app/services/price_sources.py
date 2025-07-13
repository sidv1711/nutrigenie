from abc import ABC, abstractmethod
from typing import Optional, List, Tuple

class PriceSource(ABC):
    """Abstract base for a retailer-specific price lookup implementation."""

    @abstractmethod
    def fetch_price(
        self,
        store_external_id: str,
        ingredient_name: str,
        unit: str,
    ) -> Tuple[Optional[float], str]:
        """Return (price_per_unit_in_usd, unit).

        price_per_unit_in_usd is None when the lookup fails; unit should fall
        back to the `unit` argument so the caller always gets a string it can
        persist even when the retailer API does not expose package size
        information.
        """

    @property
    @abstractmethod
    def source_name(self) -> str:
        """A short identifier (e.g. 'kroger_api') stored for debugging."""
        ...

    # --------------------------------------------------
    # Async wrapper (default implementation)
    # --------------------------------------------------
    async def async_fetch_price(
        self,
        store_external_id: str,
        ingredient_name: str,
        unit: str,
    ) -> Tuple[Optional[float], str]:
        """Asynchronously invoke *fetch_price* in a worker thread.

        Sub-classes that already use *httpx.AsyncClient* can override this
        method to avoid the extra thread hop, but for most synchronous
        implementations this default is good enough and immediately enables
        concurrency via *asyncio.gather*.
        """
        from anyio import to_thread  # lightweight, already a transitive dep

        return await to_thread.run_sync(
            self.fetch_price,
            store_external_id,
            ingredient_name,
            unit,
        ) 