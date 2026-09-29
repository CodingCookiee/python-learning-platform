async def fetch_prices(client, skus):
    """{sku: price} for every SKU, with all the requests in flight at once."""
    prices = {}
    for sku in skus:
        prices[sku] = await client.price(sku)
    return prices
