from decimal import Decimal

from plp import test, hidden, raises
import solution
from solution import InsufficientFunds, PaymentError, Wallet


def invalid_amount():
    cls = getattr(solution, "InvalidAmount", None)
    assert isinstance(cls, type) and issubclass(cls, Exception), "Define an exception class called InvalidAmount"
    return cls


@test("Refuses a payment it can't cover, with the facts attached")
def _():
    wallet = Wallet(Decimal("20.00"))
    caught = raises(InsufficientFunds, wallet.pay, Decimal("50.00"))
    assert str(caught.value) == "balance 20.00 is 30.00 short of 50.00"
    assert caught.value.balance == Decimal("20.00")
    assert caught.value.amount == Decimal("50.00")
    assert caught.value.shortfall == Decimal("30.00")
    assert wallet.balance == Decimal("20.00"), "A refused payment shouldn't change the balance"


@test("Takes a payment it can cover")
def _():
    wallet = Wallet(Decimal("20.00"))
    assert wallet.pay(Decimal("5.00")) == Decimal("15.00")
    assert wallet.balance == Decimal("15.00")


@test("Refuses an amount of zero or less with InvalidAmount")
def _():
    wallet = Wallet(Decimal("20.00"))
    raises(invalid_amount(), wallet.pay, Decimal("0"), match="^amount must be more than zero, got 0$")
    raises(invalid_amount(), wallet.pay, Decimal("-5"), match="got -5$")
    assert wallet.balance == Decimal("20.00")


@test("Both exceptions are PaymentErrors, and InvalidAmount is also a ValueError")
def _():
    assert issubclass(InsufficientFunds, PaymentError)
    assert issubclass(invalid_amount(), PaymentError)
    assert issubclass(invalid_amount(), ValueError)
    assert not issubclass(InsufficientFunds, ValueError)


@hidden("InsufficientFunds works on its own too")
def _():
    error = InsufficientFunds(Decimal("1.50"), Decimal("4.00"))
    assert str(error) == "balance 1.50 is 2.50 short of 4.00"
    assert error.shortfall == Decimal("2.50")


@hidden("Paying the whole balance leaves zero")
def _():
    wallet = Wallet(Decimal("12.34"))
    assert wallet.pay(Decimal("12.34")) == Decimal("0")
    raises(InsufficientFunds, wallet.pay, Decimal("0.01"))
