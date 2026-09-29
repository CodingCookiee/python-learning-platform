Tests for a shop's checkout often need a setting changed for a moment: another currency, or the
payment gateway's sandbox switched on. Write `override(settings, **changes)`, a context manager
made with `@contextmanager`, that:

- sets each key in `changes` on the `settings` dict for the duration of the `with` block,
- gives the `settings` dict itself to `as`,
- afterwards puts every changed key back as it was, removing keys that didn't exist before,
- does that even when the block raises, and lets the exception carry on.

```python
settings = {"currency": "EUR", "tax_rate": 0.2}
with override(settings, currency="GBP", sandbox=True) as active:
    active["currency"]     # "GBP"
    active["sandbox"]      # True
settings                   # {"currency": "EUR", "tax_rate": 0.2}
```

Only the keys you override are restored: anything else the block changes stays changed.
