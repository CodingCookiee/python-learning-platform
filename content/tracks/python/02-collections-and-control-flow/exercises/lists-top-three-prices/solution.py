def top_three(prices):
    """Return the three highest prices, highest first. Don't change prices."""
    return sorted(prices, reverse=True)[:3]
