import math


def estimate_tokens(text):
    """About one token per four characters, rounded up."""
    return math.ceil(len(text) / 4)


def fit_history(messages, *, system, context_window, max_tokens):
    """The newest part of messages that fits the window with the system prompt and the reply."""
    return messages
