import numpy as np


class VectorIndex:
    """An in-memory vector index over chunk dicts ({"id", "text", ...metadata})."""

    def __init__(self, embed):
        self.embed = embed
        self.chunks = []
        self.vectors = []

    def add(self, chunks):
        for chunk in chunks:
            self.chunks.append(chunk)
            self.vectors.append(self.embed([chunk["text"]])[0])

    def search(self, query, k=3):
        query_vector = self.embed([query])[0]
        results = []
        for chunk, vector in zip(self.chunks, self.vectors):
            chunk["score"] = float(np.dot(query_vector, vector))
            results.append(chunk)
        return results[:k]

    def __len__(self):
        return len(self.chunks)
