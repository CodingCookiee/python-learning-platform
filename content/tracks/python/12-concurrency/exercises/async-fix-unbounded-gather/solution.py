import asyncio


async def sync_products(api, products, *, limit=5):
    """Upsert every product to the storefront; return the storefront ids in order."""
    semaphore = asyncio.Semaphore(limit)

    async def upsert(product):
        async with semaphore:
            return await api.upsert(product)

    return await asyncio.gather(*(upsert(product) for product in products))
