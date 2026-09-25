Both functions below work, but each one spends five lines setting a flag. Rewrite them with
`all()` and `any()`, so that each function body is a single `return` and there is no `for`
statement left.

```python
order = {"id": "A1", "lines": [{"sku": "mug", "in_stock": True}, {"sku": "tea", "in_stock": False}]}
ready_to_ship(order)                             # False
needs_review([{"total": 40}, {"total": 1200}])   # True
```

Their behaviour must stay exactly the same, including for an order with no lines and for an empty
list of orders.
