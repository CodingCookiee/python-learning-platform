The fraud team wants the biggest orders from each day's export, which arrives as a stream of
`order_id,amount` lines too long to hold in memory. Write `largest_orders(lines, k)`, which returns
the `k` largest orders as `(order_id, amount)` tuples, biggest first, with the amount (in cents)
as an `int`.

```python
lines = ["ORD-1,4500", "ORD-2,120", "", "ORD-3,98000", "ORD-4,4500"]
largest_orders(lines, 3)
# [('ORD-3', 98000), ('ORD-1', 4500), ('ORD-4', 4500)]
```

- Skip blank lines (including ones that are only whitespace or a newline).
- Orders with the same amount keep the order they arrived in.
- Fewer than `k` orders in the stream: return them all.
- `lines` may be a generator that can only be read once. The tests stream 8 000 lines through
  your function and check that its peak memory stays small, so keep only what you need.
