import pytest

from cart import Cart


# test_discounts.py needs this fixture too, but it can't see it in here
@pytest.fixture
def cart():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    return cart


def test_total_includes_every_line(cart):
    assert cart.total_pence == 1950


def test_item_count_counts_units_not_lines(cart):
    assert cart.item_count == 3


# Add a test: a member's order of exactly 1000p gets the discount
