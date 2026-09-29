import math


def estimate_tokens(text):
    """About one token per four characters, rounded up. Empty text is 0 tokens."""
    return math.ceil(len(text) / 4)


def prompt_tokens(messages, system=None):
    """The estimated input tokens for a request: the system prompt plus every message's content."""
    total = estimate_tokens(system) if system else 0
    return total + sum(estimate_tokens(message["content"]) for message in messages)
