def top_three(prices):
    """Return the three highest prices, highest first. Don't change prices."""
    prices = prices.sort(reverse=True)
    return prices[:3]
