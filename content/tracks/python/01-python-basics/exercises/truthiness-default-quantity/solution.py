def order_quantity(requested):
    """Return the basket quantity: 1 if requested is None, otherwise requested (0 removes the item)."""
    return 1 if requested is None else requested
