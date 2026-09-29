import numpy as np


def top_k(scores, k):
    """Indices of the k highest scores, highest first, ties in their original order."""
    if k <= 0:
        return []
    order = np.argsort(-np.asarray(scores, dtype=float), kind="stable")
    return [int(i) for i in order[:k]]
