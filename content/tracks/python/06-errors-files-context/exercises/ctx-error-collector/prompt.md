`contextlib.suppress` swallows an error and forgets it. An import job needs to swallow bad rows
**and** report them afterwards. Write a `Collector` context manager for that:

- `Collector(*types)` takes the exception types to collect, for example
  `Collector(ValueError, KeyError)`.
- `with collector:` suppresses any exception raised in the block that is an instance of one of
  those types (subclasses included), and appends the exception object to `collector.errors`.
- Any other exception carries on as normal, and isn't recorded.
- `with collector as c:` gives you the collector itself, and the same collector can be used for
  many `with` blocks, collecting across all of them.
- `collector.summary()` returns one line per collected error, `"<type name>: <message>"`.

```python
collector = Collector(ValueError, KeyError)
quantities = []
for row in [{"sku": "MUG-01", "qty": "3"}, {"sku": "TEA-12", "qty": "two"}, {"sku": "PEN-05"}]:
    with collector:
        quantities.append(int(row["qty"]))

quantities            # [3]
collector.summary()
# ["ValueError: invalid literal for int() with base 10: 'two'", "KeyError: 'qty'"]
```
