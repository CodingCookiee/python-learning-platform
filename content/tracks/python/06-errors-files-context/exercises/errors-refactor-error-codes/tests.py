import ast

from plp import test, hidden, raises, solution_source
import solution

LIMITS = {"max_amount": 500, "blocked": {"4000-0000"}}
OK = {"id": "P-7", "card": "4242-4242", "amount": 120}
BLOCKED = {"id": "P-8", "card": "4000-0000", "amount": 20}
TOO_BIG = {"id": "P-9", "card": "4242-4242", "amount": 900}
ZERO = {"id": "P-10", "card": "4242-4242", "amount": 0}


def exception(name):
    cls = getattr(solution, name, None)
    assert isinstance(cls, type) and issubclass(cls, Exception), f"Define an exception class called {name}"
    return cls


@test("checkout still says the same thing in every case")
def _():
    assert solution.checkout(OK, LIMITS) == "Paid: AUTH-P-7"
    assert solution.checkout(BLOCKED, LIMITS) == "This card can't be used"
    assert solution.checkout(TOO_BIG, LIMITS) == "The limit is 500"
    assert solution.checkout(ZERO, LIMITS) == "Enter an amount above zero"


@test("authorise returns just the code on success")
def _():
    assert solution.authorise(OK, LIMITS) == "AUTH-P-7"


@test("authorise raises an exception for each failure")
def _():
    raises(exception("InvalidAmount"), solution.authorise, ZERO, LIMITS, match="^amount must be above zero$")
    raises(exception("CardBlocked"), solution.authorise, BLOCKED, LIMITS, match="^card 4000-0000 is blocked$")
    caught = raises(exception("LimitExceeded"), solution.authorise, TOO_BIG, LIMITS, match="^over the limit of 500$")
    assert caught.value.limit == 500


@test("The exceptions form a hierarchy")
def _():
    base = exception("PaymentError")
    for name in ("InvalidAmount", "CardBlocked", "LimitExceeded"):
        assert issubclass(exception(name), base), f"{name} should inherit from PaymentError"
    assert issubclass(exception("InvalidAmount"), ValueError)


@hidden("No error codes are left")
def _():
    codes = {"INVALID_AMOUNT", "CARD_BLOCKED", "LIMIT_EXCEEDED"}
    constants = {node.value for node in ast.walk(ast.parse(solution_source())) if isinstance(node, ast.Constant)}
    left = sorted(constants & codes)
    assert left == [], f"Remove the error codes: {', '.join(left)}"


@hidden("checkout reads the limit from the exception")
def _():
    limits = {"max_amount": 75, "blocked": set()}
    assert solution.checkout({"id": "P-11", "card": "5555", "amount": 76}, limits) == "The limit is 75"
    assert solution.checkout({"id": "P-12", "card": "5555", "amount": 75}, limits) == "Paid: AUTH-P-12"


@hidden("checkout doesn't hide unexpected errors")
def _():
    raises(KeyError, solution.checkout, {"id": "P-13", "amount": 10}, LIMITS)
