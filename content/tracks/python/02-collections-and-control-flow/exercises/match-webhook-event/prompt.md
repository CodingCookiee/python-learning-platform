A payment provider sends webhook events as dicts (parsed from JSON). Write `handle_event(event)` that
uses a `match` statement to decide what to do. Events can have extra keys; ignore them.

| Event shape | Returns |
|-------------|---------|
| `"type"` is `"order.created"`, and `"order"` is a dict with a string `"id"` and a numeric (int or float) `"total"` | `"New order ID: TOTAL"`, total to 2 decimal places |
| `"type"` is `"order.refunded"`, `"order"` is a dict with a string `"id"`, and `"amount"` is a number **greater than 0** | `"Refund AMOUNT on ID"`, amount to 2 decimal places |
| `"type"` is `"customer.deleted"` and `"customer_id"` is a string | `"Delete customer CUSTOMER_ID"` |
| any other dict whose `"type"` is a string | `"Ignored event: TYPE"` |
| anything else | `"Malformed event"` |

```python
handle_event({"type": "order.created", "order": {"id": "ORD-1042", "total": 59.9}})
# "New order ORD-1042: 59.90"

handle_event({"type": "order.refunded", "order": {"id": "ORD-1042"}, "amount": 0})
# "Ignored event: order.refunded"   (a refund of 0 isn't valid, so it's handled like any other event)
```
