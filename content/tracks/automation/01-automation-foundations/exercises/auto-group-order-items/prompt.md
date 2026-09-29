A shop's "new order lines" trigger sends one n8n item per **line**, but the refunds team wants one
Slack message per **order**. Write `group_orders(items)`, the Code node (or Python service step)
that regroups them.

Each input item looks like:

```python
{"json": {"order_id": "SO-1042", "customer_email": "amira@example.com", "sku": "MUG-STN", "qty": 2, "unit_price": "12.50"}}
```

Return one item per order, sorted by `order_id`:

```python
{
    "json": {
        "order_id": "SO-1042",
        "customer_email": "amira@example.com",
        "lines": [{"sku": "MUG-STN", "qty": 2}, {"sku": "V60-100", "qty": 1}],   # in input order
        "item_count": 3,          # the total quantity
        "total": "32.40",         # sum of qty x unit_price, exact, as text with 2 decimals
    },
    "pairedItem": [{"item": 0}, {"item": 2}],
}
```

- `pairedItem` lists the positions of the input items that went into the order. n8n uses it to
  link each output item back to its inputs, so expressions like `$('Trigger').item` keep working
  after a Code node.
- Prices are strings; add them up exactly.
- Lines with `qty` 0 (cancelled lines) are left out of `lines`, `item_count`, `total` and
  `pairedItem`. An order whose lines are all cancelled doesn't appear at all.
