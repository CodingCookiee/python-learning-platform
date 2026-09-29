from decimal import Decimal


class PaymentError(Exception):
    """Base class for everything that can go wrong paying from a wallet."""


class InsufficientFunds(PaymentError):
    """The wallet doesn't hold enough for the payment."""


# InvalidAmount: a PaymentError that's also a ValueError


class Wallet:
    def __init__(self, balance):
        self.balance = balance

    def pay(self, amount):
        """Take amount from the balance and return the new balance."""
        if amount > self.balance:
            raise ValueError("not enough money")
        self.balance -= amount
        return self.balance
