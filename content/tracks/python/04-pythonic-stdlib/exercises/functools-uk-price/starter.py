from functools import partial


def price_with_tax(net, rate):
    """Gross price, rounded to cents."""
    return round(net * (1 + rate), 2)


# price_with_tax with rate=0.20
uk_price = ...

# price_with_tax with rate=0.19
de_price = ...
