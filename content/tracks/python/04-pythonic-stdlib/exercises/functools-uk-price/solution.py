from functools import partial


def price_with_tax(net, rate):
    """Gross price, rounded to cents."""
    return round(net * (1 + rate), 2)


uk_price = partial(price_with_tax, rate=0.20)
de_price = partial(price_with_tax, rate=0.19)
