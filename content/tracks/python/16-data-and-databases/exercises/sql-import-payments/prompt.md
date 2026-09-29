The bank sends a CSV of the day's payments. Write `import_payments(conn, csv_text)`, which inserts
every row into `payments` and returns how many it imported, or imports **nothing** if any row is
bad.

```text
invoice,amount,paid_on
INV-0042,1250.00,2026-09-14
INV-0043,40.5,2026-09-14
INV-0044,3800,2026-09-15
```

```python
import_payments(conn, csv_text)    # 3
conn.execute("SELECT invoice_number, amount_cents FROM payments").fetchall()
# [("INV-0042", 125000), ("INV-0043", 4050), ("INV-0044", 380000)]
```

- `amount` is in pounds and is stored as whole pence in `amount_cents`.
- A bad row raises `ValueError` whose message starts with its line in the file (the header is
  line 1), like `line 3: amount '40,5' isn't a number` or `line 4: unknown invoice INV-9999`.
- After a `ValueError`, no row from the file is stored and no transaction is left open.

The database does part of the checking for you. `payments.invoice_number` references
`invoices.number` (the connection has foreign keys turned on), and `amount_cents` has
`CHECK (amount_cents > 0)`, so both refuse bad rows with `sqlite3.IntegrityError`.
