from plp import test, hidden
from solution import stock_level


def inventory():
    return {"MUG-01": 12, "TEE-02": 0, "CAP-03": 7}


@test("Returns the count for a listed SKU")
def _():
    assert stock_level(inventory(), "CAP-03") == 7


@test("Returns 0 for an unknown SKU")
def _():
    assert stock_level(inventory(), "HAT-09") == 0


@test("Doesn't add unknown SKUs to the inventory")
def _():
    shelf = inventory()
    stock_level(shelf, "HAT-09")
    assert shelf == inventory()


@hidden("Returns 0 for a SKU that is listed but sold out")
def _():
    assert stock_level(inventory(), "TEE-02") == 0


@hidden("Works on an empty inventory")
def _():
    assert stock_level({}, "MUG-01") == 0
