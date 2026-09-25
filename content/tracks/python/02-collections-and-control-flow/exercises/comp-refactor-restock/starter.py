def restock_list(inventory):
    """Return the SKUs with fewer than 5 units, upper-cased, in inventory order."""
    result = []
    for sku, count in inventory.items():
        if count < 5:
            result.append(sku.upper())
    return result
