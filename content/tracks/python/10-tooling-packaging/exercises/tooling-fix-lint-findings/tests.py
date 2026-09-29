import ast

from plp import test, hidden, solution_source, source_avoids
from solution import load_orders

EXPORT = '{"id": "A-1"}\nnot json\n{"id": "A-2", "coupon": "AUTUMN10"}\n{"id": "A-1"}'
EXPECTED = [{"id": "A-1", "coupon": ""}, {"id": "A-2", "coupon": "AUTUMN10"}]


def tree():
    return ast.parse(solution_source())


@test("Reads orders, skipping bad lines and repeats")
def _():
    assert load_orders(EXPORT) == EXPECTED


@test("A second run returns the same orders (B006)")
def _():
    load_orders(EXPORT)
    assert load_orders(EXPORT) == EXPECTED, "The second call should return the same orders as the first"


@test("Catches only the JSON error (E722)")
def _():
    handlers = [node for node in ast.walk(tree()) if isinstance(node, ast.ExceptHandler)]
    caught = [ast.unparse(handler.type) if handler.type is not None else "(bare except)" for handler in handlers]
    too_broad = [name for name in caught if name in ("(bare except)", "Exception", "BaseException")]
    assert too_broad == [], f"Catch json.JSONDecodeError instead of {too_broad[0] if too_broad else ''}"


@test("Compares with None using is (E711)")
def _():
    loose = [
        ast.unparse(node)
        for node in ast.walk(tree())
        if isinstance(node, ast.Compare)
        and any(isinstance(op, (ast.Eq, ast.NotEq)) for op in node.ops)
        and any(isinstance(side, ast.Constant) and side.value is None for side in [node.left, *node.comparators])
    ]
    assert loose == [], f"Use `is None` instead of `{loose[0] if loose else ''}`"


@test("Has no unused imports (F401)")
def _():
    assert source_avoids(name="os"), "Remove `import os`: nothing uses it"


@hidden("An explicit null coupon becomes an empty string too")
def _():
    export = '{"id": "B-7", "coupon": null}\n\n{"id": "B-8", "coupon": "VIP"}'
    assert load_orders(export) == [{"id": "B-7", "coupon": ""}, {"id": "B-8", "coupon": "VIP"}]
