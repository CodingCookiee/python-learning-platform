import numpy as np


def _unit(vectors):
    vectors = np.asarray(vectors, dtype=float)
    norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
    return vectors / np.where(norms == 0, 1.0, norms)


class PolicySearch:
    """Cosine search over chunk vectors."""

    def __init__(self, vectors, ids):
        self.matrix = _unit(vectors)
        self.ids = list(ids)

    def search(self, query, k=5):
        scores = self.matrix @ _unit(query)
        best = np.argsort(-scores, kind="stable")[:k]
        return [(self.ids[i], round(float(scores[i]), 6)) for i in best]
