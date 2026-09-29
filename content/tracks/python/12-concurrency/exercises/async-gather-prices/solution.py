import asyncio


async def fetch_prices(client, skus):
    """{sku: price} for every SKU, with all the requests in flight at once."""
    prices = await asyncio.gather(*(client.price(sku) for sku in skus))
    return dict(zip(skus, prices))
