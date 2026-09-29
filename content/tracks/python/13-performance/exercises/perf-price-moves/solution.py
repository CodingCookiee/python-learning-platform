import numpy as np


def big_moves(prices, threshold):
    """Indices of the ticks where the price moved by threshold or more since the tick before."""
    change = np.diff(prices) / prices[:-1]  # change[j] is the move from tick j to tick j + 1
    return np.flatnonzero(np.abs(change) >= threshold) + 1
