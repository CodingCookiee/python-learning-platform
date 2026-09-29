The finance dashboard's "revenue by country" panel has started timing out. For each order, it
searches the customer list for the customer who placed it:

```python
customers = [{"id": "C-1", "country": "GB"}, {"id": "C-2", "country": "DE"}]
orders = [
    {"id": "ORD-1", "customer_id": "C-2", "amount": 4_500},
    {"id": "ORD-2", "customer_id": "C-1", "amount": 1_250},
    {"id": "ORD-3", "customer_id": "C-2", "amount": 800},
    {"id": "ORD-4", "customer_id": "C-9", "amount": 300},
]
revenue_by_country(orders, customers)
# {'DE': 5300, 'GB': 1250, 'unknown': 300}
```

Make `revenue_by_country` fast enough for a month of orders (8 000 of them, from 4 000 customers)
inside the time limit, with exactly the same results. Amounts are in cents, customer IDs are
unique, and an order from a customer who isn't in the list counts as `"unknown"`.
