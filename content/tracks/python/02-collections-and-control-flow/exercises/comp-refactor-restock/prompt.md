`restock_list(inventory)` returns the SKUs that are running low (fewer than 5 units), upper-cased, in
inventory order:

```python
restock_list({"mug-01": 12, "tee-02": 0, "cap-03": 4, "scarf-04": 5})
# ["TEE-02", "CAP-03"]
```

It works, but it's the empty-list-then-append loop that a list comprehension replaces. Rewrite the
body as a single list comprehension, with no `append`. The results must not change.
