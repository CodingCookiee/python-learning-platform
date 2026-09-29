def estimate_tokens(text):
    """About one token per four characters, rounded up. Empty text is 0 tokens."""
    ...


def prompt_tokens(messages, system=None):
    """The estimated input tokens for a request: the system prompt plus every message's content."""
    ...
