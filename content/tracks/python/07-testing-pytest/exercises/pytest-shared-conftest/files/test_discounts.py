from cart import Cart, Customer


def test_members_get_ten_percent_off(cart, member):
    assert cart.total_for(member) == 1755


def test_guests_pay_full_price(cart):
    assert cart.total_for(Customer("Sam")) == 1950


def test_small_orders_get_no_discount(member):
    small = Cart()
    small.add("TEA", 2, 350)
    assert small.total_for(member) == 700
