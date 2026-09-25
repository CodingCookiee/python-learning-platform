`Order(lines)` stores a list of `(product, quantity, unit_price)` tuples as `lines`. Add two
read-only properties:

- `total`: the sum of quantity times unit price over every line.
- `item_count`: the total number of items, the sum of the quantities.

Both are computed from `lines` whenever they're read, so they stay right when a line is added.

```python
order = Order([("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
order.total        # 33.0
order.item_count   # 3
order.lines.append(("Filter papers", 3, 2.0))
order.total        # 39.0
```
