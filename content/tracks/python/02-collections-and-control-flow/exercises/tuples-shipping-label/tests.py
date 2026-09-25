from plp import test, hidden, source_avoids
from solution import shipping_label


@test("Prints the same four-line label")
def _():
    order = ("ORD-1042", "Ada Lovelace", ("12 Hill Street", "London", "N1 9GU"))
    assert shipping_label(order) == "Ada Lovelace\n12 Hill Street\nLondon N1 9GU\nOrder ORD-1042"


@test("Works for a different order")
def _():
    order = ("ORD-2001", "Grace Hopper", ("4 Harbour Road", "Leith", "EH6 6LB"))
    assert shipping_label(order) == "Grace Hopper\n4 Harbour Road\nLeith EH6 6LB\nOrder ORD-2001"


@test("Unpacks the record instead of indexing it")
def _():
    assert source_avoids(node="Subscript"), (
        "Your code still indexes the record (like order[1] or order[2][0]). "
        "Unpack it into names instead: order_id, name, (street, city, postcode) = order"
    )


@hidden("Works when the address is a list rather than a tuple")
def _():
    order = ("ORD-3003", "Linus Torvalds", ["1 Kernel Way", "Portland", "97201"])
    assert shipping_label(order) == "Linus Torvalds\n1 Kernel Way\nPortland 97201\nOrder ORD-3003"
