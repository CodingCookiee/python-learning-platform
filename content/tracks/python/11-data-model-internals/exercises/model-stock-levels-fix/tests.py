from plp import test, hidden
from solution import StockLevels, restock_message


def sample():
    return StockLevels({"MUG-01": 12, "TEA-50": 3, "LAMP-02": 0})


@test("in, iteration and truth tests all work")
def _():
    levels = sample()
    assert levels["MUG-01"] == 12
    assert restock_message(levels, "TEA-50") == "TEA-50: 3 in stock"
    assert levels.low_stock(5) == ["LAMP-02", "TEA-50"]
    assert restock_message(StockLevels({}), "TEA-50") == "No stock data loaded"


@test("in checks SKUs")
def _():
    levels = sample()
    assert "LAMP-02" in levels
    assert "DESK-9" not in levels
    assert restock_message(levels, "DESK-9") == "DESK-9: not stocked"


@test("Iterating gives the SKUs, and len counts them")
def _():
    levels = sample()
    assert list(levels) == ["MUG-01", "TEA-50", "LAMP-02"]
    assert len(levels) == 3
    assert bool(levels) is True
    assert len(StockLevels({})) == 0


@hidden("in is a lookup, not a scan of every SKU")
def _():
    assert hasattr(StockLevels, "__contains__"), (
        "Without __contains__, in falls back to iterating over every SKU until it finds a match"
    )
    assert "MUG-01" in sample()


@hidden("A SKU with zero stock is still stocked")
def _():
    levels = sample()
    assert restock_message(levels, "LAMP-02") == "LAMP-02: 0 in stock"
    assert levels.low_stock(1) == ["LAMP-02"]
    assert levels.low_stock(0) == []
