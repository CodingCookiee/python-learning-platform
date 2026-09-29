def authorise(payment, limits):
    """Return (auth_code, None) on success, or (None, error_code) on failure."""
    if payment["amount"] <= 0:
        return None, "INVALID_AMOUNT"
    if payment["card"] in limits["blocked"]:
        return None, "CARD_BLOCKED"
    if payment["amount"] > limits["max_amount"]:
        return None, "LIMIT_EXCEEDED"
    return f"AUTH-{payment['id']}", None


def checkout(payment, limits):
    """The message the customer sees."""
    code, error = authorise(payment, limits)
    if error == "INVALID_AMOUNT":
        return "Enter an amount above zero"
    if error == "CARD_BLOCKED":
        return "This card can't be used"
    if error == "LIMIT_EXCEEDED":
        return f"The limit is {limits['max_amount']}"
    return f"Paid: {code}"
