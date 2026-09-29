import numpy as np


def cosine(a, b):
    """Cosine similarity of two vectors, as a float. 0.0 if either is a zero vector."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(a @ b / (norm_a * norm_b))
