Tests and one-off jobs often need a setting changed for a moment: a lower rate limit, a different
currency. Write a generator-based context manager, `override(settings, **changes)`, using
`@contextmanager`:

- On entry it applies `changes` to the `settings` dict, and the `with ... as` target is that same
  dict.
- On exit it puts every changed key back exactly as it was. A key that didn't exist before is
  removed again. Keys it didn't change are left alone, even if the block changed them.
- It restores the settings however the block ends. An exception still reaches the caller.

```python
settings = {"currency": "GBP", "rate_limit": 100}
with override(settings, currency="EUR", sandbox=True) as active:
    active       # {"currency": "EUR", "rate_limit": 100, "sandbox": True}
settings         # {"currency": "GBP", "rate_limit": 100}
```
