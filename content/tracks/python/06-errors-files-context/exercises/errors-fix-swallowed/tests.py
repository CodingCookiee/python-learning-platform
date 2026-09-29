import ast
from decimal import Decimal

from plp import test, hidden, raises, solution_source
from solution import total_payments

ROWS = [
    {"id": "P-1001", "amount": "12.50"},
    {"id": "P-1002", "amount": "n/a"},
    {"id": "P-1003", "amount": "7.25"},
]


def broad_handlers():
    """Line numbers of bare excepts and except Exception / BaseException clauses."""
    found = []
    for node in ast.walk(ast.parse(solution_source())):
        if isinstance(node, ast.ExceptHandler):
            names = [node.type] if not isinstance(node.type, ast.Tuple) else node.type.elts
            if node.type is None or any(
                isinstance(n, ast.Name) and n.id in ("Exception", "BaseException") for n in names
            ):
                found.append(node.lineno)
    return found


@test("Adds up the amounts and skips the one that isn't a number")
def _():
    assert total_payments(ROWS) == Decimal("19.75")


@test("A row without an amount stops the import with KeyError")
def _():
    broken = [{"id": "P-2001", "amount": "5.00"}, {"id": "P-2002", "amonut": "3.00"}]
    raises(KeyError, total_payments, broken)


@test("Catches only the error it expects")
def _():
    assert broad_handlers() == [], "Name the exception: no bare except, except Exception or except BaseException"


@hidden("Keeps every decimal place")
def _():
    rows = [{"amount": "0.10"}, {"amount": "0.20"}, {"amount": "-0.05"}]
    assert total_payments(rows) == Decimal("0.25")


@hidden("Returns zero for no rows or only bad amounts")
def _():
    assert total_payments([]) == Decimal("0")
    assert total_payments([{"amount": "n/a"}, {"amount": ""}]) == Decimal("0")
