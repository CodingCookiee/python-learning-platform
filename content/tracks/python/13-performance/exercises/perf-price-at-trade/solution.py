from bisect import bisect_right


def prices_at(trade_times, change_times, change_prices):
    """The price in effect at each trade time, or None before the first change."""
    prices = []
    for when in trade_times:
        latest = bisect_right(change_times, when) - 1
        prices.append(change_prices[latest] if latest >= 0 else None)
    return prices
