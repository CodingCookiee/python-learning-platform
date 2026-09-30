VAT_RATE = 0.2
BULK_QUANTITY = 10
BULK_DISCOUNT = 0.1


def with_vat(net):
    """Return net plus VAT, rounded to cents."""
    return round(net * (1 + VAT_RATE), 2)


def bulk_discount(net, quantity):
    """Take 10% off a line's net price when buying 10 or more."""
    if quantity >= BULK_QUANTITY:
        return round(net * (1 - BULK_DISCOUNT), 2)
    return net
