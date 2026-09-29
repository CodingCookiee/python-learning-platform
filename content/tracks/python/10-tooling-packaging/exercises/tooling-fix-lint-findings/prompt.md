`orders.py` reads one JSON order per line from an export, skipping lines that aren't valid JSON and
orders it has already seen. It passed review, then the nightly import started dropping every order
on its second run. ruff, with `select = ["E", "F", "B"]`, had already said why:

```text
orders.py:2:8: F401 [*] `os` imported but unused
orders.py:5:28: B006 Do not use mutable data structures for argument defaults
orders.py:11:9: E722 Do not use bare `except`
orders.py:16:35: E711 Comparison to `None` should be `cond is None`
Found 4 errors.
```

Fix all four findings without changing what a single call returns:

```python
export = '{"id": "A-1"}\nnot json\n{"id": "A-2", "coupon": "AUTUMN10"}\n{"id": "A-1"}'
load_orders(export)
# [{"id": "A-1", "coupon": ""}, {"id": "A-2", "coupon": "AUTUMN10"}]
```

- Calling `load_orders` twice with the same export must return the same orders both times. Callers
  only ever pass `text`.
- Catch only the error `json.loads` raises for a bad line (`json.JSONDecodeError`), not everything.
