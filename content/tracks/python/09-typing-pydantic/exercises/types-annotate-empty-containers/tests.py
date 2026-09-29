from plp import hidden, test, typecheck
from solution import reorder_list, skus_by_supplier, stock_by_sku


@test("Adds up, groups and lists stock like the example")
def _():
    assert stock_by_sku([("MUG-01", 10), ("MUG-01", -3)]) == {"MUG-01": 7}
    assert skus_by_supplier([("MUG-01", "Stoneware Co"), ("MUG-02", "Stoneware Co")]) == {
        "Stoneware Co": ["MUG-01", "MUG-02"]
    }
    assert reorder_list({"MUG-01": 2, "BEANS-1KG": 40}, threshold=5) == ["MUG-01"]


@test("mypy --strict passes", timeout=None)
def _():
    problems = typecheck(strict=True).errors
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("Handles empty input")
def _():
    assert stock_by_sku([]) == {}
    assert skus_by_supplier([]) == {}
    assert reorder_list({}, threshold=5) == []


@hidden("Keeps every supplier and sorts the reorder list")
def _():
    pairs = [("A-1", "North"), ("B-1", "South"), ("A-2", "North")]
    assert skus_by_supplier(pairs) == {"North": ["A-1", "A-2"], "South": ["B-1"]}
    assert reorder_list({"ZINE-1": 0, "APRON-1": 5, "CUP-1": 6}, threshold=5) == ["APRON-1", "ZINE-1"]
