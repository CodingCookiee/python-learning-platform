`Settings` gives attribute access to a dict of app settings and remembers which ones were changed.
It doesn't work at all yet: creating one crashes. Fix it so that this works:

```python
settings = Settings({"currency": "GBP", "timeout": 30})
settings.timeout = 60
settings.timeout                   # 60
settings.changed()                 # ['timeout']
getattr(settings, "retries", 3)    # 3
hasattr(settings, "debug")         # False
```

- Reading a setting that doesn't exist raises `AttributeError`, with the setting's name in the
  message, so `getattr` defaults and `hasattr` work.
- Settings are kept in the dict, not as instance attributes: `vars(settings)` holds only the
  underscored internals.
- `copy.copy(settings)` returns a working copy.
