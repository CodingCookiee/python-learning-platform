The order service has an async client. `await client.fetch_order(order_id)` returns an order like
this one:

```python
{"id": "A-1042", "lines": [
    {"sku": "ETH-1KG", "quantity": 2, "unit_price": 14.20},
    {"sku": "MUG-STN", "quantity": 1, "unit_price": 5.60},
]}
```

Write a coroutine function `order_total(client, order_id)` that fetches the order and returns its
total, rounded to 2 decimal places.

```python
total = await order_total(client, "A-1042")
total     # 34.0
```
