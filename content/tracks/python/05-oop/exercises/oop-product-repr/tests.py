from plp import test, hidden
from solution import Product


@test("repr() recreates the product, str() reads well")
def _():
    mug = Product("MUG-01", "Coffee mug", 8.0)
    assert repr(mug) == "Product('MUG-01', 'Coffee mug', 8.0)"
    assert str(mug) == "Coffee mug (MUG-01) at 8.00"


@test("Lists show each product's repr")
def _():
    items = [Product("MUG-01", "Coffee mug", 8.0), Product("LAMP-02", "Desk lamp", 24.5)]
    assert repr(items) == "[Product('MUG-01', 'Coffee mug', 8.0), Product('LAMP-02', 'Desk lamp', 24.5)]"


@test("f-strings use str by default and repr with !r")
def _():
    mug = Product("MUG-01", "Coffee mug", 8.0)
    assert f"{mug}" == "Coffee mug (MUG-01) at 8.00"
    assert f"{mug!r}" == "Product('MUG-01', 'Coffee mug', 8.0)"


@hidden("Quotes survive in the repr")
def _():
    tin = Product("TIN-9", "Baker's tin", 3)
    assert repr(tin) == 'Product(\'TIN-9\', "Baker\'s tin", 3)'
    assert str(tin) == "Baker's tin (TIN-9) at 3.00"


@hidden("The repr evaluates back to an equivalent product")
def _():
    lamp = Product("LAMP-02", "Desk lamp", 24.5)
    again = eval(repr(lamp), {"Product": Product})
    assert (again.sku, again.name, again.price) == ("LAMP-02", "Desk lamp", 24.5)
