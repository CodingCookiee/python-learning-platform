import math
import random


def token_probabilities(logits, temperature):
    """Softmax of logits / temperature, as a dict with the same keys in the same order."""
    scaled = {token: logit / temperature for token, logit in logits.items()}
    top = max(scaled.values())
    weights = {token: math.exp(value - top) for token, value in scaled.items()}
    total = sum(weights.values())
    return {token: weight / total for token, weight in weights.items()}


def sample_next_token(logits, *, temperature, top_p=1.0, rng):
    """Pick the next token: greedy at temperature 0, otherwise sample from the top-p set."""
    if temperature < 0:
        raise ValueError("temperature can't be negative")
    if not 0 < top_p <= 1:
        raise ValueError("top_p must be more than 0 and at most 1")
    if temperature == 0:
        return max(logits, key=logits.get)

    ranked = sorted(token_probabilities(logits, temperature).items(), key=lambda pair: pair[1], reverse=True)
    nucleus, cumulative = [], 0.0
    for token, probability in ranked:
        nucleus.append((token, probability))
        cumulative += probability
        if cumulative >= top_p:
            break
    tokens = [token for token, _ in nucleus]
    weights = [probability for _, probability in nucleus]
    return rng.choices(tokens, weights=weights)[0]
