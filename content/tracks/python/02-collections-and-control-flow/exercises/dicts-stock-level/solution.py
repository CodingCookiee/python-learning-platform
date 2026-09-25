def stock_level(inventory, sku):
    """Return how many units of sku are in inventory, or 0 if it isn't listed."""
    return inventory.get(sku, 0)
