from plp import test, hidden, source_avoids, source_uses
from solution import restock_list


@test("Lists the low-stock SKUs, upper-cased, in order")
def _():
    assert restock_list({"mug-01": 12, "tee-02": 0, "cap-03": 4, "scarf-04": 5}) == ["TEE-02", "CAP-03"]


@test("Returns an empty list when nothing is low")
def _():
    assert restock_list({"mug-01": 12, "scarf-04": 5}) == []


@test("Uses a list comprehension instead of append")
def _():
    assert source_uses(node="ListComp"), "Build the result with a list comprehension: [... for sku, count in inventory.items() if ...]"
    assert source_avoids(call="append"), "The comprehension replaces the loop, so there should be no append() left"


@hidden("Works on an empty inventory")
def _():
    assert restock_list({}) == []
