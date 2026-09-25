def coupon_discount(code, subtotal):
    """Return the percentage discount (an int) that code gives on an order of subtotal."""
    if code is None:
        return 0
    code = code.strip().upper()
    if code == "SAVE10":
        return 10 if subtotal >= 50 else 0
    elif code == "VIP20":
        return 20
    else:
        return 0
