import pytest

from cart import Cart


# Write a fixture called cart here


def test_new_cart_is_empty():
    assert Cart().total_pence == 0
