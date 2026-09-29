import numpy as np


def _matches(chunk, where):
    for key, wanted in where.items():
        if key not in chunk:
            return False
        if isinstance(wanted, (list, tuple, set, frozenset)):
            if chunk[key] not in wanted:
                return False
        elif chunk[key] != wanted:
            return False
    return True


class VectorIndex:
    """An in-memory vector index over chunk dicts ({"id", "text", ...metadata})."""

    def __init__(self, embed):
        self.embed = embed
        self.chunks = []
        self.matrix = None

    @staticmethod
    def _unit(vectors):
        vectors = np.asarray(vectors, dtype=float)
        norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
        return vectors / np.where(norms == 0, 1.0, norms)

    def add(self, chunks):
        chunks = list(chunks)
        if not chunks:
            return
        vectors = self._unit(self.embed([chunk["text"] for chunk in chunks]))
        self.matrix = vectors if self.matrix is None else np.vstack([self.matrix, vectors])
        self.chunks.extend(chunks)

    def search(self, query, k=3, where=None):
        rows = [i for i, chunk in enumerate(self.chunks) if not where or _matches(chunk, where)]
        if not rows or k <= 0:
            return []
        rows = np.array(rows)
        query_vector = self._unit(self.embed([query])[0])
        scores = self.matrix[rows] @ query_vector
        best = np.argsort(-scores, kind="stable")[:k]
        return [{**self.chunks[rows[i]], "score": float(scores[i])} for i in best]

    def __len__(self):
        return len(self.chunks)
