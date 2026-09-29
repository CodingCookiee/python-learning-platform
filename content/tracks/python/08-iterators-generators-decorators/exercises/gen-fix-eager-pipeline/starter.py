def parse_payments(lines):
    """Each "timestamp,order_id,amount_pence,status" line as a dict."""
    payments = []
    for line in lines:
        timestamp, order_id, amount, status = line.split(",")
        payments.append({"order_id": order_id, "amount": int(amount), "status": status, "at": timestamp})
    return payments


def declined(payments):
    """Only the declined payments."""
    found = []
    for payment in payments:
        if payment["status"] == "declined":
            found.append(payment)
    return found


def first_declines(lines, n):
    """The order ids of the first n declined payments."""
    return [payment["order_id"] for payment in declined(parse_payments(lines))[:n]]
