import numpy as np


def big_moves(prices, threshold):
    """Indices of the ticks where the price moved by threshold or more since the tick before."""
    moves = []
    for i in range(1, len(prices)):
        change = (prices[i] - prices[i - 1]) / prices[i - 1]
        if abs(change) >= threshold:
            moves.append(i)
    return np.array(moves, dtype=int)
