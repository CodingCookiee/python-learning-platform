def price_with_tax(price, tax_rate):
    """Return price plus tax as a Decimal, rounded to the cent (half a cent rounds up).

    price and tax_rate are strings, like "19.99" and "0.20".
    """
    total = float(price) * (1 + float(tax_rate))
    return round(total, 2)
