import json
import math


def estimate_tokens(text):
    """About four characters per token, rounded up."""
    return math.ceil(len(text) / 4)


def history_tokens(messages, *, system=None):
    """Estimated input tokens for sending these messages (and the system prompt)."""
    ...
