from plp import test, hidden
from solution import Product


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


def set_attr(obj, name, value):
    return lambda: setattr(obj, name, value)


@test("Rounds the price and tracks whether it's in stock")
def _():
    mug = Product("Mug", 8.004, stock=3)
    assert mug.price == 8.0
    assert mug.in_stock is True
    mug.stock = 0
    assert mug.in_stock is False


@test("Refuses a negative price after creation, and keeps the old one")
def _():
    mug = Product("Mug", 8.0)
    assert raises_value_error(set_attr(mug, "price", -5)), "mug.price = -5 should raise ValueError"
    assert mug.price == 8.0


@test("Refuses a negative price at creation")
def _():
    assert raises_value_error(lambda: Product("Lamp", -1)), 'Product("Lamp", -1) should raise ValueError'


@test("Refuses stock that's negative or not a whole number")
def _():
    mug = Product("Mug", 8.0, stock=2)
    assert raises_value_error(set_attr(mug, "stock", -1)), "mug.stock = -1 should raise ValueError"
    assert raises_value_error(set_attr(mug, "stock", 1.5)), "mug.stock = 1.5 should raise ValueError"
    assert mug.stock == 2


@hidden("A new product defaults to no stock, and a free product is allowed")
def _():
    sample = Product("Sample sachet", 0)
    assert sample.price == 0
    assert sample.stock == 0
    assert sample.in_stock is False


@hidden("in_stock is read-only")
def _():
    mug = Product("Mug", 8.0, stock=1)
    try:
        mug.in_stock = False
    except AttributeError:
        return
    raise AssertionError("mug.in_stock = False should raise AttributeError")


@hidden("Rounds prices set later too")
def _():
    mug = Product("Mug", 8.0)
    mug.price = 7.499
    assert mug.price == 7.5
    assert raises_value_error(lambda: Product("Mug", 1, stock=-3)), "stock=-3 at creation should raise ValueError"
