from plp import test, hidden, raises
from solution import validate


def positive(value):
    return value > 0


def currency_code(value):
    return isinstance(value, str) and len(value) == 3 and value.isupper()


def make_charge(calls):
    @validate(amount=positive, currency=currency_code)
    def charge(customer_id, amount, currency="GBP"):
        """Charge a customer's saved card."""
        calls.append(customer_id)
        return f"charged {amount:.2f} {currency} to {customer_id}"

    return charge


@test("Lets good calls through and stops bad ones")
def _():
    charge = make_charge([])
    assert charge("C1", 12.5) == "charged 12.50 GBP to C1"
    with raises(ValueError, match="amount=-5 failed positive"):
        charge("C1", -5)
    with raises(ValueError, match="currency='pounds' failed currency_code"):
        charge("C1", 5, currency="pounds")


@test("A refused call never reaches the function")
def _():
    calls = []
    charge = make_charge(calls)
    raises(ValueError, charge, "C1", 0)
    assert calls == []


@test("Checks arguments however they're passed")
def _():
    charge = make_charge([])
    assert charge(customer_id="C2", currency="EUR", amount=3) == "charged 3.00 EUR to C2"
    with raises(ValueError, match="amount=-1 failed positive"):
        charge(amount=-1, customer_id="C2")


@test("Keeps the name and docstring")
def _():
    charge = make_charge([])
    assert charge.__name__ == "charge"
    assert charge.__doc__ == "Charge a customer's saved card."


@hidden("Defaults are checked too")
def _():
    @validate(currency=currency_code)
    def quote(amount, currency="gbp"):
        return amount

    with raises(ValueError, match="currency='gbp' failed currency_code"):
        quote(10)
    assert quote(10, "GBP") == 10


@hidden("A check for a missing parameter fails when decorating")
def _():
    def refund(order_id, amount):
        return amount

    with raises(TypeError):
        validate(amout=positive)(refund)


@hidden("A call with the wrong arguments is still a TypeError")
def _():
    charge = make_charge([])
    raises(TypeError, charge, "C1")
