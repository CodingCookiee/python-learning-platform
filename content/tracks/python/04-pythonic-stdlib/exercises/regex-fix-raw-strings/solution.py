import re

PRICE = re.compile(r"\$(\d+\.\d\d)\b")


def find_prices(text):
    """Every price like $12.50 in text, as floats."""
    return [float(price) for price in PRICE.findall(text)]
