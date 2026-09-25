Write `group_by_customer(orders, groups)` where `orders` is a list of `(customer, order_id)` pairs.
It returns a dict mapping each customer to the list of their order ids, in the order they appear.

`groups` is optional. Without it, the function returns a new dict. With it, the orders are added
into that dict, which is then returned, so a report can be built up day by day:

```python
group_by_customer([("ada", 1001), ("grace", 1002), ("ada", 1003)])
# {"ada": [1001, 1003], "grace": [1002]}

week = group_by_customer([("ada", 1001)])
group_by_customer([("ada", 1004), ("linus", 1005)], week)
week
# {"ada": [1001, 1004], "linus": [1005]}
```

Two calls that don't pass `groups` must never share results.
