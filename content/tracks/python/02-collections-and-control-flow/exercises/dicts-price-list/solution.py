def price_list(base, regional, withdrawn):
    """Return base prices overridden by regional ones, without the withdrawn SKUs."""
    prices = base | regional
    for sku in withdrawn:
        prices.pop(sku, None)
    return prices
