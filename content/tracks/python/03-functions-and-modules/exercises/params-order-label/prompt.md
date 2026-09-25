Write `order_label(order_id, prefix="ORD", width=5)` that returns a label for a warehouse ticket:
the prefix, a dash, and the order number padded with zeros to `width` digits.

```python
order_label(1042)                 # "ORD-01042"
order_label(7, "INV")             # "INV-00007"
order_label(1042, width=7)        # "ORD-0001042"
```

`prefix` and `width` are optional. A number with more digits than `width` is never cut short.
