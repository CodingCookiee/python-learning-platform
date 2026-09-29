async def iter_orders(client):
    """Yield every order from every page of the orders API, fetching pages as needed."""
    cursor = None
    while True:
        page = await client.page(cursor)
        for order in page["orders"]:
            yield order
        cursor = page["next"]
        if cursor is None:
            return
