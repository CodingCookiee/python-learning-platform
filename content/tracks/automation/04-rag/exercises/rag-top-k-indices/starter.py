import numpy as np


def top_k(scores, k):
    """Indices of the k highest scores, highest first, ties in their original order."""
    return sorted(range(len(scores)), key=lambda i: scores[i])[:k]
