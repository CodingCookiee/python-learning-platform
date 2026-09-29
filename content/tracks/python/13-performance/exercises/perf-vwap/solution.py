def vwap(prices, volumes):
    """The volume-weighted average price of a day's trades."""
    # Both arguments are numpy arrays already, so their own methods do all the work
    return float((prices * volumes).sum() / volumes.sum())
