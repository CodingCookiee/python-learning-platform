def paid_totals(invoices):
    """Return the total with 20% VAT of every paid invoice, rounded to cents."""
    paid = filter(lambda invoice: invoice["status"] == "paid", invoices)
    return list(map(lambda invoice: round(invoice["net"] * 1.2, 2), paid))


def overdue_ids(invoices, today):
    """Return the ids of unpaid invoices whose due_day is before today."""
    return list(
        map(
            lambda invoice: invoice["id"],
            filter(lambda invoice: invoice["status"] != "paid" and invoice["due_day"] < today, invoices),
        )
    )
