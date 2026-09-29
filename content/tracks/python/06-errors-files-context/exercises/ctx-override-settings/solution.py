from contextlib import contextmanager

MISSING = object()


@contextmanager
def override(settings, **changes):
    """Apply changes to settings for the duration of a with block, then undo them."""
    saved = {key: settings.get(key, MISSING) for key in changes}
    settings.update(changes)
    try:
        yield settings
    finally:
        for key, value in saved.items():
            if value is MISSING:
                settings.pop(key, None)
            else:
                settings[key] = value
