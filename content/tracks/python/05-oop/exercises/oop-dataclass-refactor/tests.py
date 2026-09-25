import ast
from dataclasses import fields, is_dataclass

from plp import test, hidden, solution_source, source_uses
from solution import Supplier


@test("Behaves like the original class")
def _():
    acme = Supplier("Acme Tools", "DE")
    assert repr(acme) == "Supplier(name='Acme Tools', country='DE', lead_time_days=14)"
    assert acme == Supplier("Acme Tools", "DE")
    assert acme.ships_within(10) is False


@test("Is a dataclass")
def _():
    assert source_uses(name="dataclass") or source_uses(call="dataclass"), "Use the @dataclass decorator"
    assert is_dataclass(Supplier), "Supplier should be a dataclass"


@test("Has the three fields, in order")
def _():
    assert [f.name for f in fields(Supplier)] == ["name", "country", "lead_time_days"]


@hidden("Accepts keyword arguments and a custom lead time")
def _():
    quick = Supplier(name="Quick Parts", country="GB", lead_time_days=3)
    assert quick.ships_within(3) is True
    assert quick != Supplier("Quick Parts", "GB")


@hidden("The boilerplate methods are generated, not hand-written")
def _():
    defined = {node.name for node in ast.walk(ast.parse(solution_source())) if isinstance(node, ast.FunctionDef)}
    written = sorted(defined & {"__init__", "__repr__", "__eq__"})
    assert written == [], f"Let the dataclass generate {', '.join(written)}"
    assert (Supplier("Acme", "DE") == "Acme") is False
