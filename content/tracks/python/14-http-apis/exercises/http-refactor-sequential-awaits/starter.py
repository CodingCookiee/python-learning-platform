import asyncio


async def fetch_stock_levels(client, skus):
    """Units available per SKU, as a dict in the order of skus."""
    levels = {}
    for sku in skus:
        response = await client.get(f"/v1/stock/{sku}")
        response.raise_for_status()
        levels[sku] = response.json()["available"]
    return levels
