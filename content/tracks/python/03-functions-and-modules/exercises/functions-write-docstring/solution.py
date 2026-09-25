def late_fee(amount_due, days_late):
    """Return the late fee for an unpaid invoice, rounded to cents.

    amount_due is the unpaid amount; days_late is how many days overdue it is.
    The fee is 2% of amount_due per day late, capped at 25% of amount_due.
    """
    if days_late <= 0:
        return 0.0
    fee = amount_due * 0.02 * days_late
    return round(min(fee, amount_due * 0.25), 2)
