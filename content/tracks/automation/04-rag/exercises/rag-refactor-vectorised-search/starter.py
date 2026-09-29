import math

import numpy as np


class PolicySearch:
    """Cosine search over chunk vectors."""

    def __init__(self, vectors, ids):
        self.vectors = vectors
        self.ids = ids

    def search(self, query, k=5):
        scored = []
        for chunk_id, vector in zip(self.ids, self.vectors):
            dot = sum(q * v for q, v in zip(query, vector))
            norm_query = math.sqrt(sum(q * q for q in query))
            norm_vector = math.sqrt(sum(v * v for v in vector))
            score = dot / (norm_query * norm_vector) if norm_query and norm_vector else 0.0
            scored.append((score, chunk_id))
        scored.sort(key=lambda pair: -pair[0])
        return [(chunk_id, round(score, 6)) for score, chunk_id in scored[:k]]
