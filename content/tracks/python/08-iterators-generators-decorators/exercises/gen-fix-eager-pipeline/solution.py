from itertools import islice


def parse_payments(lines):
    """Each "timestamp,order_id,amount_pence,status" line as a dict."""
    for line in lines:
        timestamp, order_id, amount, status = line.split(",")
        yield {"order_id": order_id, "amount": int(amount), "status": status, "at": timestamp}


def declined(payments):
    """Only the declined payments."""
    for payment in payments:
        if payment["status"] == "declined":
            yield payment


def first_declines(lines, n):
    """The order ids of the first n declined payments."""
    return [payment["order_id"] for payment in islice(declined(parse_payments(lines)), n)]
