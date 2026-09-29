def record_payment(conn, invoice_number, amount_cents, paid_on):
    """Record a payment and mark its invoice paid. ValueError if there's no such invoice."""
    conn.execute(
        "INSERT INTO payments (invoice_number, amount_cents, paid_on) VALUES (?, ?, ?)",
        (invoice_number, amount_cents, paid_on),
    )
    updated = conn.execute("UPDATE invoices SET status = 'paid' WHERE number = ?", (invoice_number,))
    if updated.rowcount == 0:
        raise ValueError(f"No invoice {invoice_number}")
