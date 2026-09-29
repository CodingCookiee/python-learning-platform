from orders import order_total


def test_empty_order_costs_nothing():
    assert order_total([]) == 0


# Add tests that would catch a mistake in the arithmetic
