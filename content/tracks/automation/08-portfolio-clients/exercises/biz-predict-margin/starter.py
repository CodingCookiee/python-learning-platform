from decimal import ROUND_HALF_UP, Decimal

cost = Decimal("400")          # EXAMPLE: the month's AI and hosting bill
rate = Decimal("0.25")

markup_price = cost * (1 + rate)
margin_price = cost / (1 - rate)


def pct(part, whole):
    return (part / whole * 100).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


print("markup price:", markup_price)
print("  its margin:", pct(markup_price - cost, markup_price), "%")
print("margin price:", margin_price.quantize(Decimal("0.01")))
print("  its markup:", pct(margin_price - cost, cost), "%")
