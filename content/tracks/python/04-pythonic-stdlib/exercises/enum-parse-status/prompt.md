Order statuses arrive from a spreadsheet as untidy text: `"Paid"`, `" shipped "`, `"REFUNDED"`.
The `OrderStatus` enum is defined for you. Write `parse_status(text)` that returns the matching
member, ignoring case and surrounding spaces, or `None` if the text isn't a status.

```python
parse_status("Paid")        # OrderStatus.PAID
parse_status(" shipped ")   # OrderStatus.SHIPPED
parse_status("lost")        # None
```
