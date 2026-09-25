def paid_totals(invoices):
    """Return the total with 20% VAT of every paid invoice, rounded to cents."""
    return [round(invoice["net"] * 1.2, 2) for invoice in invoices if invoice["status"] == "paid"]


def overdue_ids(invoices, today):
    """Return the ids of unpaid invoices whose due_day is before today."""
    return [
        invoice["id"]
        for invoice in invoices
        if invoice["status"] != "paid" and invoice["due_day"] < today
    ]
