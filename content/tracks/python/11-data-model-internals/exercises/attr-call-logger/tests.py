from plp import test, hidden, raises
from solution import CallLogger


class PaymentGateway:
    def __init__(self, fee_percent):
        self.fee_percent = fee_percent
        self.charges = {}

    def __repr__(self):
        return f"PaymentGateway(fee_percent={self.fee_percent})"

    def charge(self, amount, currency="GBP"):
        """Take a payment and return its charge ID."""
        if amount <= 0:
            raise ValueError("amount must be positive")
        charge_id = f"ch_{len(self.charges) + 1}"
        self.charges[charge_id] = (amount, currency)
        return charge_id

    def refund(self, charge_id):
        return self.charges.pop(charge_id)


@test("Forwards reads, writes and calls, and logs the calls")
def _():
    gateway = PaymentGateway(fee_percent=2)
    logged = CallLogger(gateway)
    assert logged.charge(50, currency="EUR") == "ch_1"
    assert logged.fee_percent == 2
    logged.fee_percent = 3
    assert gateway.fee_percent == 3
    assert logged.calls == [("charge", (50,), {"currency": "EUR"})]


@test("Calls reach the real object, in order")
def _():
    gateway = PaymentGateway(fee_percent=2)
    logged = CallLogger(gateway)
    first = logged.charge(20)
    logged.charge(35, "USD")
    assert logged.refund(first) == (20, "GBP")
    assert gateway.charges == {"ch_2": (35, "USD")}
    assert logged.calls == [("charge", (20,), {}), ("charge", (35, "USD"), {}), ("refund", ("ch_1",), {})]


@test("Shows what it wraps")
def _():
    logged = CallLogger(PaymentGateway(fee_percent=2))
    assert repr(logged) == "CallLogger(PaymentGateway(fee_percent=2))"
    assert logged.charge.__name__ == "charge"
    assert logged.charge.__doc__ == "Take a payment and return its charge ID."


@hidden("A call that raises is logged and the error reaches the caller")
def _():
    logged = CallLogger(PaymentGateway(fee_percent=2))
    raises(ValueError, logged.charge, -5, match="positive")
    assert logged.calls == [("charge", (-5,), {})]


@hidden("Missing attributes raise AttributeError, and nothing lands on the proxy")
def _():
    gateway = PaymentGateway(fee_percent=2)
    logged = CallLogger(gateway)
    raises(AttributeError, getattr, logged, "capture")
    assert hasattr(logged, "refund")
    logged.region = "eu"
    assert gateway.region == "eu"
    assert "region" not in vars(logged)


@hidden("Wraps any object, including built-ins")
def _():
    basket = ["MUG-01"]
    logged = CallLogger(basket)
    logged.append("TEA-50")
    logged.extend(["LAMP-02"])
    assert basket == ["MUG-01", "TEA-50", "LAMP-02"]
    assert logged.count("TEA-50") == 1
    assert [name for name, _, _ in logged.calls] == ["append", "extend", "count"]
