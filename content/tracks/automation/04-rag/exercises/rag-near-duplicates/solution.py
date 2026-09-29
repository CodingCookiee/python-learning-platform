import numpy as np


def near_duplicates(texts, embed, threshold=0.9):
    """Pairs (i, j, score) of texts whose cosine similarity is at least threshold, most similar first."""
    if len(texts) < 2:
        return []
    vectors = np.asarray(embed(list(texts)), dtype=float)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    unit = vectors / np.where(norms == 0, 1.0, norms)
    similarity = np.round(unit @ unit.T, 3)
    rows, cols = np.triu_indices(len(texts), k=1)
    keep = similarity[rows, cols] >= threshold
    pairs = [(int(i), int(j), float(similarity[i, j])) for i, j in zip(rows[keep], cols[keep])]
    return sorted(pairs, key=lambda pair: (-pair[2], pair[0], pair[1]))
