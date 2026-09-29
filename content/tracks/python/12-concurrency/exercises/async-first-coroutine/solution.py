async def order_total(client, order_id):
    """Fetch the order and return its total, rounded to 2 decimal places."""
    order = await client.fetch_order(order_id)
    return round(sum(line["quantity"] * line["unit_price"] for line in order["lines"]), 2)
