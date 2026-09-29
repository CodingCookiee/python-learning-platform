import math
import random


def token_probabilities(logits, temperature):
    """Softmax of logits / temperature, as a dict with the same keys in the same order."""
    ...


def sample_next_token(logits, *, temperature, top_p=1.0, rng):
    """Pick the next token: greedy at temperature 0, otherwise sample from the top-p set."""
    ...
