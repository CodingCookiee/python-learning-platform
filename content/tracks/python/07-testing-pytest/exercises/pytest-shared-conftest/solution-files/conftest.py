# pytest loads this file itself: every test file in this folder can use its fixtures
import pytest

from cart import Cart, Customer


@pytest.fixture
def cart():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    return cart


@pytest.fixture
def member():
    return Customer("Amira", member=True)
