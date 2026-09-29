from decimal import Decimal


class PaymentError(Exception):
    """Base class for everything that can go wrong paying from a wallet."""


class InsufficientFunds(PaymentError):
    """The wallet doesn't hold enough for the payment."""

    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(f"balance {balance} is {self.shortfall} short of {amount}")

    @property
    def shortfall(self):
        return self.amount - self.balance


class InvalidAmount(PaymentError, ValueError):
    """A payment amount that can never be valid."""


class Wallet:
    def __init__(self, balance):
        self.balance = balance

    def pay(self, amount):
        """Take amount from the balance and return the new balance."""
        if amount <= 0:
            raise InvalidAmount(f"amount must be more than zero, got {amount}")
        if amount > self.balance:
            raise InsufficientFunds(self.balance, amount)
        self.balance -= amount
        return self.balance
