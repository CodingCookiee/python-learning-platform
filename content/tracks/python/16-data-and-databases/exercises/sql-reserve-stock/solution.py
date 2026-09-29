def reserve_stock(conn, sku, quantity):
    """Take quantity of sku out of stock and return True, or change nothing and return False."""
    if quantity < 1:
        raise ValueError(f"Can't reserve {quantity} of {sku}")
    with conn:
        cursor = conn.execute(
            "UPDATE stock SET on_hand = on_hand - ? WHERE sku = ? AND on_hand >= ?",
            (quantity, sku, quantity),
        )
    return cursor.rowcount == 1
