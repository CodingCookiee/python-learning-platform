class PaymentError(Exception):
    """Base class for every payment failure."""


class InvalidAmount(PaymentError, ValueError):
    """The amount can never be charged."""


class CardBlocked(PaymentError):
    """The card is on the blocked list."""


class LimitExceeded(PaymentError):
    """The amount is over the payment limit."""

    def __init__(self, limit):
        self.limit = limit
        super().__init__(f"over the limit of {limit}")


def authorise(payment, limits):
    """Return the authorisation code, or raise a PaymentError."""
    if payment["amount"] <= 0:
        raise InvalidAmount("amount must be above zero")
    if payment["card"] in limits["blocked"]:
        raise CardBlocked(f"card {payment['card']} is blocked")
    if payment["amount"] > limits["max_amount"]:
        raise LimitExceeded(limits["max_amount"])
    return f"AUTH-{payment['id']}"


def checkout(payment, limits):
    """The message the customer sees."""
    try:
        code = authorise(payment, limits)
    except InvalidAmount:
        return "Enter an amount above zero"
    except CardBlocked:
        return "This card can't be used"
    except LimitExceeded as error:
        return f"The limit is {error.limit}"
    return f"Paid: {code}"
