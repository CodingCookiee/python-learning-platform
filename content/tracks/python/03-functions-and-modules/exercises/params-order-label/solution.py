def order_label(order_id, prefix="ORD", width=5):
    """Return a label like "ORD-01042": prefix, a dash, and order_id zero-padded to width digits.

    prefix defaults to "ORD" and width defaults to 5.
    """
    return f"{prefix}-{order_id:0{width}d}"
