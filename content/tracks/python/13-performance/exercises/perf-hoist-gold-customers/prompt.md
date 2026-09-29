The loyalty team wants the orders placed by gold-tier customers, to send them a thank-you. Someone
already used a set for the membership check, but the job still crawls:

```python
customers = [
    {"id": "C-1", "tier": "gold"},
    {"id": "C-2", "tier": "silver"},
    {"id": "C-3", "tier": "gold"},
]
orders = [
    {"id": "ORD-1", "customer_id": "C-2"},
    {"id": "ORD-2", "customer_id": "C-3"},
    {"id": "ORD-3", "customer_id": "C-1"},
]
gold_order_ids(orders, customers)
# ['ORD-2', 'ORD-3']
```

Make `gold_order_ids` fast enough for 3 000 orders from 3 000 customers inside the time limit,
with exactly the same result.
