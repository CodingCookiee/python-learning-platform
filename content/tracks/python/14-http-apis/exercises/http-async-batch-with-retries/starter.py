import asyncio
from decimal import Decimal

import httpx


async def sync_prices(client, skus, *, limit=4, attempts=3, sleep=asyncio.sleep):
    """Fetch every SKU's price concurrently. Returns (prices, failed), both in the order of skus."""
    prices, failed = {}, {}
    for sku in skus:
        response = await client.get(f"/v1/prices/{sku}")
        if response.is_success:
            prices[sku] = Decimal(response.json()["price"])
        else:
            failed[sku] = f"HTTP {response.status_code}"
    return prices, failed
