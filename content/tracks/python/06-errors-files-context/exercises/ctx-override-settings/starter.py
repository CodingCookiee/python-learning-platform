from contextlib import contextmanager


@contextmanager
def override(settings, **changes):
    """Apply changes to settings for the duration of a with block, then undo them."""
    settings.update(changes)
    yield settings
