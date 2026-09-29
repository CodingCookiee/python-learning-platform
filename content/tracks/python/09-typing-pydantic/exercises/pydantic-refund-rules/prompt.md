Write a `RefundRequest` model for the support team's refund form:

| Field | Type | Rules |
|-------|------|-------|
| `order_id` | str | required |
| `paid_cents` | int | more than 0 |
| `refund_cents` | int | more than 0 |
| `reason` | `"damaged"`, `"late"`, `"unwanted"` or `"other"` | required |
| `note` | str or None | defaults to `None` |

Two rules involve more than one field. Check them with a model validator, raising `ValueError`
with these messages:

- A refund can't be more than was paid: `refund can't exceed the amount paid`.
- A refund for `"other"` needs a note that isn't blank: `a refund for another reason needs a note`.

```python
RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=1600, reason="damaged")   # fine
RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=5000, reason="late")
# ValidationError: ... refund can't exceed the amount paid
RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=500, reason="other", note=" ")
# ValidationError: ... a refund for another reason needs a note
```
