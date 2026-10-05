from cart import Cart


def test_total_includes_every_line(cart):
    assert cart.total_pence == 1950


def test_item_count_counts_units_not_lines(cart):
    assert cart.item_count == 3


def test_members_get_the_discount_from_exactly_1000p(member):
    order = Cart()
    order.add("TEAPOT", 1, 1000)
    assert order.total_for(member) == 900
