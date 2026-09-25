import re


def find_prices(text):
    """Every price like $12.50 in text, as floats."""
    return [float(price) for price in re.findall("\$(\d+.\d\d)\b", text)]
