import numpy as np


def similarity_scores(query, docs):
    """Cosine similarity of the query vector to each document vector."""
    matrix = np.asarray(docs, dtype=float)
    return matrix @ np.asarray(query, dtype=float)


def rank(query, docs):
    """Document indices, most similar first (ties keep their original order)."""
    return [int(i) for i in np.argsort(-similarity_scores(query, docs), kind="stable")]
