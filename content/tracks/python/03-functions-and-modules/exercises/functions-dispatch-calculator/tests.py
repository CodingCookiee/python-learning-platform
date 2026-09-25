import ast

from plp import test, hidden, solution_source
from solution import calculate


def raises_value_error(expression, message, **kwargs):
    try:
        calculate(expression, **kwargs)
    except ValueError as exc:
        assert str(exc) == message, f"calculate({expression!r}) raised ValueError({str(exc)!r}), expected the message {message!r}"
        return
    raise AssertionError(f"calculate({expression!r}) should raise ValueError({message!r})")


@test("Evaluates the four basic operators")
def _():
    assert calculate("12 * 3") == 36.0
    assert calculate("7.5 - 10") == -2.5
    assert calculate("9 / 4") == 2.25
    assert calculate("0.5 + 2") == 2.5


@test("Adds operators from extra")
def _():
    assert calculate("2 ^ 10", extra={"^": pow}) == 1024.0


@test("Rejects an unknown operator")
def _():
    raises_value_error("2 ^ 10", "Unknown operator: ^")


@test("Rejects an expression without three parts")
def _():
    raises_value_error("12 *", 'Expected "number operator number"')


@hidden("Always returns a float")
def _():
    result = calculate("2 + 2")
    assert type(result) is float, f"calculate('2 + 2') returned a {type(result).__name__}, expected a float"
    assert calculate("7 % 4", extra={"%": lambda a, b: a % b}) == 3.0


@hidden("extra doesn't leak into later calls")
def _():
    calculate("8 max 3", extra={"max": max})
    raises_value_error("8 max 3", "Unknown operator: max")
    assert calculate("8 - 3", extra={"max": max}) == 5.0


@hidden("Uses a dict of functions rather than an if/elif chain")
def _():
    tree = ast.parse(solution_source())
    symbol_checks = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Compare)
        and any(isinstance(side, ast.Constant) and side.value in ("+", "-", "*", "/") for side in [node.left, *node.comparators])
    ]
    assert not symbol_checks, "Look the operator up in a dict of functions instead of comparing it with each symbol"
