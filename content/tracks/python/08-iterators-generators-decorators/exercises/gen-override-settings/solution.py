from contextlib import contextmanager

MISSING = object()


@contextmanager
def override(settings, **changes):
    """Apply changes to settings for the duration of a with block, then restore them."""
    saved = {key: settings.get(key, MISSING) for key in changes}
    settings.update(changes)
    try:
        yield settings
    finally:
        for key, old in saved.items():
            if old is MISSING:
                settings.pop(key, None)
            else:
                settings[key] = old
