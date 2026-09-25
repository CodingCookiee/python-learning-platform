from collections import namedtuple

Order = namedtuple("Order", ["id", "customer", "total"])


def parse_order(line):
    """Turn "A1042, ada, 20.00" into an Order."""
    order_id, customer, total = (field.strip() for field in line.split(","))
    return Order(order_id, customer, float(total))


def apply_discount(order, percent):
    """A new Order with the total reduced by percent, rounded to cents."""
    return order._replace(total=round(order.total * (1 - percent / 100), 2))
