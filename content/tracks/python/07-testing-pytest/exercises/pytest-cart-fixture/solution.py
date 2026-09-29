import pytest

from cart import Cart


@pytest.fixture
def cart():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    return cart


def test_new_cart_is_empty():
    assert Cart().total_pence == 0


def test_total_includes_every_line(cart):
    assert cart.total_pence == 1950


def test_item_count_counts_units_not_lines(cart):
    assert cart.item_count == 3


def test_adding_a_product_again_adds_to_its_quantity(cart):
    cart.add("TEA", 2, 350)
    assert cart.item_count == 5


def test_remove_takes_out_only_that_product(cart):
    cart.remove("MUG")
    assert cart.total_pence == 350
