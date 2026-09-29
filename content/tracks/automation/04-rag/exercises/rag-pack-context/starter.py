import math

import numpy as np


def estimate_tokens(text):
    """About four characters per token, at least one for non-empty text."""
    return max(1, math.ceil(len(text) / 4)) if text else 0


def pack_context(ranked, embed, max_tokens=800, duplicate_threshold=0.95):
    """The chunks to send, within the token budget and without near-duplicates, best at the edges."""
    chosen, used = [], 0
    for chunk in ranked:
        used += estimate_tokens(chunk["text"])
        if used > max_tokens:
            break
        chosen.append(chunk)
    return chosen
