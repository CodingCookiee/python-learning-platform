The analytics export flattens each order's JSON into dotted keys, one `(key, value)` pair per leaf,
with list positions as numbers. It should do this:

```python
order = {
    "id": "A1",
    "customer": {"name": "Ada", "address": {"city": "Leeds"}},
    "lines": [{"sku": "MUG", "qty": 2}],
    "tags": ["gift", "fragile"],
}
list(flatten(order))
# [("id", "A1"), ("customer.name", "Ada"), ("customer.address.city", "Leeds"),
#  ("lines.0.sku", "MUG"), ("lines.0.qty", 2), ("tags.0", "gift"), ("tags.1", "fragile")]
```

Instead, every nested field silently goes missing. Fix `flatten`. Lists can hold dicts or plain
values, and `flatten` must stay a generator.
