import contextlib
import importlib
import sys
import tempfile
from pathlib import Path

from plp import test, hidden, raises, solution_source

CUSTOMERS = '''import orders


class Customer:
    def __init__(self, name):
        self.name = name
        self.orders = []

    def place_order(self, total):
        order = orders.Order(self, total)
        self.orders.append(order)
        return order
'''


@contextlib.contextmanager
def shop():
    """customers.py and your orders.py in a fresh folder on sys.path, with a clean module cache."""
    folder = Path(tempfile.mkdtemp())
    (folder / "customers.py").write_text(CUSTOMERS)
    (folder / "orders.py").write_text(solution_source())
    for name in ("customers", "orders"):
        sys.modules.pop(name, None)
    sys.path.insert(0, str(folder))
    importlib.invalidate_caches()
    try:
        yield
    finally:
        sys.path.remove(str(folder))
        for name in ("customers", "orders"):
            sys.modules.pop(name, None)


def load(first):
    """Import `first`, then the other module, and return (customers, orders)."""
    importlib.import_module(first)
    return sys.modules["customers"], importlib.import_module("orders")


@test("Importing customers first works")
def _():
    with shop():
        customers, orders = load("customers")
        ada = customers.Customer("Ada")
        assert repr(ada.place_order(120)) == "Order('Ada', 120)"
        raises(TypeError, orders.Order, "Ada", 120, match="needs a Customer")
        assert orders.total_spent(ada) == 120


@test("Importing orders first works too")
def _():
    with shop():
        customers, orders = load("orders")
        grace = customers.Customer("Grace")
        grace.place_order(30)
        grace.place_order(45.5)
        assert orders.total_spent(grace) == 75.5


@test("Orders are still checked against the real Customer class")
def _():
    with shop():
        customers, orders = load("customers")

        class Impostor:
            name = "Eve"
            orders = []

        raises(TypeError, orders.Order, Impostor(), 10)
        order = orders.Order(customers.Customer("Ada"), 10)
        assert order.customer.name == "Ada"


@hidden("A customer with no orders has spent nothing")
def _():
    with shop():
        customers, orders = load("customers")
        assert orders.total_spent(customers.Customer("Linus")) == 0
