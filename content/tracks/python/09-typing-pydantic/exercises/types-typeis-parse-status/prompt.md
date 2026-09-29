A warehouse CSV export has a status column of plain text. Turn it into `OrderStatus` values that
mypy trusts, and label them for the dashboard. Write three fully typed functions:

- `is_order_status(value: str) -> TypeIs[OrderStatus]`: `True` if `value` is exactly one of the four
  statuses. Because it returns `TypeIs`, mypy narrows a `str` to `OrderStatus` wherever it returns
  `True`.
- `parse_statuses(rows: list[str]) -> list[OrderStatus]`: strips and lowercases each row, and raises
  `ValueError("row 3: unknown status 'lost'")` (numbered from 1, showing the cleaned text) for the
  first row that isn't a status.
- `status_label(status: OrderStatus) -> str`: `"Awaiting payment"`, `"Paid, not shipped"`,
  `"On its way"` or `"Cancelled"`. Write it as a `match` that ends in `assert_never`, so adding a
  fifth status later becomes a mypy error here.

No casts, no `Any`, and `mypy --strict` must pass.

```python
parse_statuses([" Paid", "SHIPPED "])     # ["paid", "shipped"]
parse_statuses(["paid", "pending", "lost"])  # ValueError: row 3: unknown status 'lost'
status_label("paid")                      # "Paid, not shipped"
```
