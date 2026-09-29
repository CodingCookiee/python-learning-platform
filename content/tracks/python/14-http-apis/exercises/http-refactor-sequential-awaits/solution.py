import asyncio


async def stock_level(client, sku):
    response = await client.get(f"/v1/stock/{sku}")
    response.raise_for_status()
    return response.json()["available"]


async def fetch_stock_levels(client, skus):
    """Units available per SKU, as a dict in the order of skus."""
    levels = await asyncio.gather(*(stock_level(client, sku) for sku in skus))
    return dict(zip(skus, levels))
