`record_payment(conn, invoice_number, amount_cents, paid_on)` inserts a payment and marks its
invoice paid, and raises `ValueError` if there's no such invoice. Its tests passed, because they
checked through the same connection. In production:

- the accounts dashboard, on its own connection, never sees the payments;
- after a payment for a mistyped invoice number, the next call's work vanishes along with it.

```python
record_payment(conn, "INV-0042", 125000, "2026-09-14")
dashboard.execute("SELECT status FROM invoices WHERE number = 'INV-0042'").fetchone()
# ('sent',)   ← should be ('paid',)
```

Fix it so a successful call is committed, and a failed call leaves nothing behind and no
transaction open. Don't close the connection: the caller owns it.
