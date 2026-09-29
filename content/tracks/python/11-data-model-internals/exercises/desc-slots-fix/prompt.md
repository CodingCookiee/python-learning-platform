A market-data feed produces millions of `Tick` objects a day, so someone added `__slots__` to save
memory. Now the module won't even import:

```text
ValueError: 'currency' in __slots__ conflicts with class variable
```

Fix it so that this works:

```python
tick = record(Tick("ACME", 101.25))
tick.currency                  # "USD", the default
Tick("SAP", 118.4, "EUR").currency    # "EUR"
latest["ACME"] is tick         # True
```

- `Tick` keeps its slots: instances have no `__dict__`, and assigning an attribute that isn't a
  slot (a typo like `tick.prcie = 3`) raises `AttributeError`.
- `latest` is a `weakref.WeakValueDictionary`, so it must not keep ticks alive: once nothing else
  refers to a tick, it disappears from `latest`. Don't change `latest` or `record`.
