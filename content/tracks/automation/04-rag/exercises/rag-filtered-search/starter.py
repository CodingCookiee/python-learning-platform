import numpy as np


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
        if not self.chunks or k <= 0:
            return []
        query_vector = self._unit(self.embed([query])[0])
        scores = self.matrix @ query_vector
        best = np.argsort(-scores, kind="stable")[:k]
        return [{**self.chunks[i], "score": float(scores[i])} for i in best]

    def __len__(self):
        return len(self.chunks)
