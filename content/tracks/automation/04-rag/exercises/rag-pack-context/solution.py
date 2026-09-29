import math

import numpy as np


def estimate_tokens(text):
    """About four characters per token, at least one for non-empty text."""
    return max(1, math.ceil(len(text) / 4)) if text else 0


def pack_context(ranked, embed, max_tokens=800, duplicate_threshold=0.95):
    """The chunks to send, within the token budget and without near-duplicates, best at the edges."""
    if not ranked:
        return []
    vectors = np.asarray(embed([chunk["text"] for chunk in ranked]), dtype=float)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    unit = vectors / np.where(norms == 0, 1.0, norms)

    selected, budget = [], max_tokens
    for i, chunk in enumerate(ranked):
        if selected and float(np.max(unit[selected] @ unit[i])) >= duplicate_threshold:
            continue
        tokens = estimate_tokens(chunk["text"])
        if tokens > budget:
            continue
        selected.append(i)
        budget -= tokens
    chosen = [ranked[i] for i in selected]
    return chosen[0::2] + chosen[1::2][::-1]
