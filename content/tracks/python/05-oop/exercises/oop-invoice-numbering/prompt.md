Write an `Invoice` class that numbers invoices in the order they're created.

- Two class attributes: `next_number`, starting at `1`, and `vat_rate`, starting at `0.2`.
- `Invoice(customer, net)` stores `customer` and `net`, and gives the invoice a `number` like
  `"INV-0001"` (four digits, zero-padded) from `next_number`, which then goes up by one.
- `gross()` returns `net` plus VAT, rounded to 2 decimals.

```python
first = Invoice("Northwind", 100)
second = Invoice("Contoso", 250)
first.number, second.number   # ("INV-0001", "INV-0002")
second.gross()                # 300.0
```

The VAT rate works like a default: changing `Invoice.vat_rate` changes it for every invoice, but a
single VAT-exempt invoice can override it with `invoice.vat_rate = 0`.
