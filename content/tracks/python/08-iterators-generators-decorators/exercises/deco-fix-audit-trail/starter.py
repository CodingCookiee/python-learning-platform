AUDIT_TRAIL = []


def audited(func):
    def wrapper(*args):
        AUDIT_TRAIL.append((func.__name__, args, {}))
        func(*args)

    return wrapper


@audited
def refund(order_id, amount, *, reason=""):
    """Refund part or all of an order."""
    return f"refunded {amount:.2f} on {order_id}"


@audited
def void(order_id):
    """Cancel an order that hasn't been paid."""
    return f"voided {order_id}"
