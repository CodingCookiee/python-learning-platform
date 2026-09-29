import asyncio


async def sync_products(api, products):
    """Upsert every product to the storefront; return the storefront ids in order."""
    return await asyncio.gather(*(api.upsert(product) for product in products))
