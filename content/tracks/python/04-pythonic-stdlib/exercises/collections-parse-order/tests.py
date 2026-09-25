from plp import test, hidden
from solution import Order, parse_order, apply_discount


@test("Parses a line into an Order")
def _():
    order = parse_order("A1042, ada, 20.00")
    assert order == Order("A1042", "ada", 20.0)
    assert order.customer == "ada"


@test("Order is a namedtuple with the fields id, customer and total")
def _():
    assert Order._fields == ("id", "customer", "total")
    assert isinstance(parse_order("A1,ada,5"), tuple)


@test("The total is a float")
def _():
    assert isinstance(parse_order("A7,grace,12").total, float)


@test("apply_discount returns a new, discounted Order")
def _():
    order = Order("A1042", "ada", 20.0)
    assert apply_discount(order, 10) == Order("A1042", "ada", 18.0)
    assert order.total == 20.0


@hidden("Rounds the discounted total to cents")
def _():
    assert apply_discount(Order("A2", "grace", 19.99), 15).total == 16.99


@hidden("The discounted order is still an Order")
def _():
    result = apply_discount(parse_order("A3,linus,40"), 25)
    assert isinstance(result, Order)
    assert result.id == "A3" and result.total == 30.0
