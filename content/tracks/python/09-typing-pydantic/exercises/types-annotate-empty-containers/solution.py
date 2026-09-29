def stock_by_sku(movements: list[tuple[str, int]]) -> dict[str, int]:
    """Add up each SKU's stock movements."""
    stock: dict[str, int] = {}
    for sku, change in movements:
        stock[sku] = stock.get(sku, 0) + change
    return stock


def skus_by_supplier(products: list[tuple[str, str]]) -> dict[str, list[str]]:
    """Group (sku, supplier) pairs into each supplier's SKUs, in order."""
    by_supplier: dict[str, list[str]] = {}
    for sku, supplier in products:
        by_supplier.setdefault(supplier, []).append(sku)
    return by_supplier


def reorder_list(stock: dict[str, int], threshold: int) -> list[str]:
    """The SKUs at or below the threshold, sorted."""
    to_order: list[str] = []
    if not stock:
        return to_order
    for sku, level in stock.items():
        if level <= threshold:
            to_order.append(sku)
    return sorted(to_order)
