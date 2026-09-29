An invoice has one or more lines. The starter has both models with their columns; finish them and
write two functions.

- Link the models with a one-to-many relationship: `invoice.lines` is the invoice's lines in the
  order they were added, and `line.invoice` is the line's invoice.
- `invoice.total_cents` is a property: the sum of `quantity * unit_price_cents` over its lines.
- `create_invoice(session, number, customer, lines)` takes `lines` as
  `(description, quantity, unit_price_cents)` tuples, adds a sent invoice with those lines to the
  session (without committing), and returns it. No lines, or a quantity below 1, raises
  `ValueError` and adds nothing.
- `outstanding(session)` returns `(customer, total_cents)` for invoices whose status is `"sent"`,
  biggest total first, ties by customer. Compute it in the database, in **one** query.

```python
invoice = create_invoice(session, "INV-0042", "Acme", [("Desk, oak", 1, 30000), ("Lamp", 2, 4500)])
invoice.total_cents          # 39000
session.commit()
outstanding(session)         # [("Acme", 39000)]
```
