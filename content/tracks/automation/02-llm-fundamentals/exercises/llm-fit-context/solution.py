import math


def estimate_tokens(text):
    """About one token per four characters, rounded up."""
    return math.ceil(len(text) / 4)


def fit_history(messages, *, system, context_window, max_tokens):
    """The newest part of messages that fits the window with the system prompt and the reply."""
    budget = context_window - max_tokens - estimate_tokens(system or "")
    kept = []
    used = 0
    for message in reversed(messages):
        cost = estimate_tokens(message["content"])
        if used + cost > budget:
            break
        kept.append(message)
        used += cost
    if not kept and messages:
        raise ValueError("The newest message doesn't fit in the context window on its own")
    kept.reverse()
    while kept and kept[0]["role"] != "user":
        kept.pop(0)
    return kept
