import numpy as np


def _unit_rows(matrix):
    norms = np.linalg.norm(matrix, axis=-1, keepdims=True)
    return matrix / np.where(norms == 0, 1.0, norms)


def similarity_scores(query, docs):
    """Cosine similarity of the query vector to each document vector."""
    matrix = _unit_rows(np.asarray(docs, dtype=float))
    unit_query = _unit_rows(np.asarray(query, dtype=float))
    return matrix @ unit_query


def rank(query, docs):
    """Document indices, most similar first (ties keep their original order)."""
    return [int(i) for i in np.argsort(-similarity_scores(query, docs), kind="stable")]
