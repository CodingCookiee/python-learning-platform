def restock_list(inventory):
    """Return the SKUs with fewer than 5 units, upper-cased, in inventory order."""
    return [sku.upper() for sku, count in inventory.items() if count < 5]
