# The checkout: totals a basket using the rules in pricing.py
from pricing import bulk_discount, with_vat


def basket_total(items):
    """Return the total to pay for [(name, unit_price, quantity), ...]."""
    net = 0
    for _name, unit_price, quantity in items:
        net += bulk_discount(unit_price * quantity, quantity)
    return with_vat(net)
