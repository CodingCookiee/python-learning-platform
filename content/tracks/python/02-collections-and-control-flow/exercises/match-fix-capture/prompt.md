`order_message(status)` turns an order status into the message a customer sees:

| Status | Message |
|--------|---------|
| `"pending"` | `"Waiting for payment"` |
| `"paid"` | `"Preparing your order"` |
| `"shipped"` | `"On its way"` |
| `"delivered"` | `"Delivered"` |
| anything else | `"Unknown status: <status>"` |

```python
order_message("shipped")     # "On its way"
order_message("cancelled")   # "Unknown status: cancelled"
```

Right now every cancelled order tells the customer it's on its way. Fix the `match`, then add the
missing statuses. Statuses are case-sensitive: `"Shipped"` is unknown.
