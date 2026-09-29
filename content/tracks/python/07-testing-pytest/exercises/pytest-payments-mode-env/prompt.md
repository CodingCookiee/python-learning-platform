The shop decides whether to take real payments from an environment variable:

```python
# config.py
import os

MODES = ("sandbox", "live")


def payments_mode():
    """Which payment environment to use, from the PAYMENTS_MODE environment variable.

    Case and surrounding spaces don't matter. Unset means "sandbox", the safe choice.
    Any other value raises ValueError, so a typo can't silently pick a mode.
    """
    mode = os.environ.get("PAYMENTS_MODE", "sandbox").strip().lower()
    if mode not in MODES:
        raise ValueError(f"PAYMENTS_MODE must be sandbox or live, not {mode!r}")
    return mode
```

Write `test_config.py`, using the `monkeypatch` fixture to set and remove `PAYMENTS_MODE` in each
test. Don't assign to `os.environ` directly: a value left behind would leak into every test that
runs after it. Your tests must pass on this code and catch the bugs planted in copies of it.
