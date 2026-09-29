import numpy as np


def most_similar(question, faqs, embed, k=3):
    """The k FAQ entries closest to the question, as (faq, cosine score) pairs, best first."""
    if not faqs:
        return []
    vectors = np.asarray(embed([question, *faqs]), dtype=float)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors = vectors / np.where(norms == 0, 1.0, norms)
    query, matrix = vectors[0], vectors[1:]
    scores = matrix @ query
    best = np.argsort(-scores, kind="stable")[:k]
    return [(faqs[i], float(scores[i])) for i in best]
