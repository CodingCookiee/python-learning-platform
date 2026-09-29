def big_moves(prices, threshold):
    """Indices of the ticks where the price moved by threshold or more since the tick before."""
    previous = prices[:-1]
    change = (prices[1:] - previous) / previous  # change[j] is the move from tick j to tick j + 1
    return (abs(change) >= threshold).nonzero()[0] + 1
