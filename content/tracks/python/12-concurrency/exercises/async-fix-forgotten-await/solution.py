async def basket_total(client, skus):
    """Price every SKU, record the quote in the audit log, and return the total."""
    total = 0
    for sku in skus:
        price = await client.price(sku)
        total += price
    total = round(total, 2)
    await client.audit("quote", skus, total)
    return total
