from orders import order_total


def test_empty_order_costs_nothing():
    assert order_total([]) == 0


def test_quantity_multiplies_the_unit_price():
    assert order_total([("MUG", 2, 800)]) == 1600


def test_adds_up_every_line():
    assert order_total([("MUG", 2, 800), ("TEA", 1, 350)]) == 1950
