from plp import test, hidden, raises
from solution import TrackedRecord


class Customer(TrackedRecord):
    def __init__(self, name, tier):
        self.name = name
        self.tier = tier


class Invoice(TrackedRecord):
    def __init__(self, number, total):
        self.number = number
        self.total = total
        self._cache = None

    def recalculate(self):
        self._cache = self.total * 1.2
        return self._cache


@test("Records edits and deletions, but not first assignments or no-ops")
def _():
    ada = Customer("Ada", "silver")
    ada.tier = "gold"
    ada.tier = "gold"
    ada.email = "ada@example.com"
    del ada.email
    assert ada.changes == [("tier", "silver", "gold"), ("email", "ada@example.com", None)]


@test("A fresh record has no changes, and attributes still work normally")
def _():
    grace = Customer("Grace", "gold")
    assert grace.changes == []
    assert (grace.name, grace.tier) == ("Grace", "gold")
    grace.name = "Grace Hopper"
    assert grace.name == "Grace Hopper"
    assert grace.changes == [("name", "Grace", "Grace Hopper")]


@test("Underscored attributes are never tracked")
def _():
    invoice = Invoice("INV-7", 100)
    invoice.recalculate()
    invoice._cache = None
    invoice.total = 150
    assert invoice.changes == [("total", 100, 150)]
    assert invoice.recalculate() == 180.0


@hidden("Each record keeps its own history")
def _():
    ada = Customer("Ada", "silver")
    grace = Customer("Grace", "silver")
    ada.tier = "gold"
    assert grace.changes == []
    grace.tier = "bronze"
    assert ada.changes == [("tier", "silver", "gold")]
    assert grace.changes == [("tier", "silver", "bronze")]


@hidden("The history can't be edited from outside")
def _():
    ada = Customer("Ada", "silver")
    ada.tier = "gold"
    ada.changes.clear()
    assert ada.changes == [("tier", "silver", "gold")]
    with raises(AttributeError, what="ada.changes = []"):
        ada.changes = []
    assert len(ada.changes) == 1


@hidden("A value set back to its original is two changes")
def _():
    ada = Customer("Ada", "silver")
    ada.tier = "gold"
    ada.tier = "silver"
    assert ada.changes == [("tier", "silver", "gold"), ("tier", "gold", "silver")]
    raises(AttributeError, delattr, ada, "phone")
