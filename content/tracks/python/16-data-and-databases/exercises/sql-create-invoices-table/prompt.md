Write `create_invoices_table(conn)`, which creates an `invoices` table whose schema refuses bad
data by itself. Its columns, in this order:

| Column | Type | Rules |
|--------|------|-------|
| `id` | `INTEGER` | The primary key |
| `number` | `TEXT` | Required, and no two invoices share one |
| `customer` | `TEXT` | Required |
| `amount_cents` | `INTEGER` | Required, zero or more |
| `status` | `TEXT` | Required, `'draft'` when the insert leaves it out, and only `'draft'`, `'sent'` or `'paid'` |
| `issued_on` | `TEXT` | Optional (a draft hasn't been issued) |

Any insert that breaks a rule should fail with `sqlite3.IntegrityError`.

```python
create_invoices_table(conn)
conn.execute("INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-001', 'Acme', 125000)")
conn.execute("SELECT number, status, issued_on FROM invoices").fetchone()
# ('INV-001', 'draft', None)
```

The starter creates the columns but none of the rules.
