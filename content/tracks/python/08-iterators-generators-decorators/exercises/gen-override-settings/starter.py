from contextlib import contextmanager


def override(settings, **changes):
    """Apply changes to settings for the duration of a with block, then restore them."""
    ...
