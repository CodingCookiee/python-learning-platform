def check_refund(amount, paid):
    """Return amount if the refund is allowed, or raise ValueError saying why not."""
    if amount <= 0:
        raise ValueError("refund must be more than zero")
    if amount > paid:
        raise ValueError(f"refund of {amount} is more than the {paid} paid")
    return amount
