"""Order pricing for Fernhill Tea's web shop.

Written by a contractor in 2021, in production ever since, and never tested.
Every basket on the site is priced by quote(). Prices in the price list exclude VAT.

    prices = load_price_list("prices.csv")
    print_quote(quote({"EB-250": 2, "MUG-01": 1}, prices, "UK"))
"""

import csv
import json
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from urllib.request import urlopen

PENNY = Decimal("0.01")
VAT_RATE = Decimal("0.20")
BULK_QUANTITY = 10  # this many of one product or more...
BULK_DISCOUNT = Decimal("0.05")  # ...takes 5% off that line
FREE_SHIPPING_FROM = Decimal("50.00")
SHIPPING = {"UK": Decimal("3.95"), "EU": Decimal("7.50"), "WORLD": Decimal("14.00")}
RATES_URL = "https://rates.fernhill.example/latest?base=GBP&symbols={currency}"


@dataclass(frozen=True)
class Coupon:
    code: str
    percent: int  # 10 means 10% off the goods
    expires: date  # the last day it can be used
    minimum: Decimal = Decimal("0")  # the goods subtotal needed to use it


@dataclass(frozen=True)
class Quote:
    subtotal: Decimal
    discount: Decimal
    shipping: Decimal
    vat: Decimal
    total: Decimal


def load_price_list(path):
    """Read a sku,name,price CSV file into {sku: (name, price)}.

    Blank lines are skipped. A missing or negative price, or a SKU that appears
    twice, raises ValueError naming the line it's on.
    """
    prices = {}
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            sku = row["sku"].strip()
            if sku in prices:
                raise ValueError(f"line {reader.line_num}: {sku} appears twice")
            try:
                price = Decimal(row["price"])
            except (InvalidOperation, TypeError):
                raise ValueError(f"line {reader.line_num}: {sku} has no valid price") from None
            if price < 0:
                raise ValueError(f"line {reader.line_num}: {sku} has a negative price")
            prices[sku] = (row["name"].strip(), price)
    return prices


def line_total(unit_price, quantity):
    """The price of one line. 10 or more of one product take 5% off the line,
    rounded half-up to the penny."""
    if quantity < 1:
        raise ValueError(f"quantity must be at least 1, got {quantity}")
    total = unit_price * quantity
    if quantity >= BULK_QUANTITY:
        total -= (total * BULK_DISCOUNT).quantize(PENNY, rounding=ROUND_HALF_UP)
    return total


def goods_subtotal(cart, prices):
    """The total of a cart ({sku: quantity}), priced from the price list."""
    subtotal = Decimal("0.00")
    for sku, quantity in cart.items():
        if sku not in prices:
            raise ValueError(f"unknown SKU: {sku}")
        _, unit_price = prices[sku]
        subtotal += line_total(unit_price, quantity)
    return subtotal


def coupon_discount(coupon, subtotal, today):
    """What a coupon takes off the goods subtotal, rounded half-up to the penny.

    Nothing if there's no coupon, if it has expired, or if the subtotal is below
    its minimum.
    """
    if coupon is None or today > coupon.expires or subtotal < coupon.minimum:
        return Decimal("0.00")
    return (subtotal * coupon.percent / 100).quantize(PENNY, rounding=ROUND_HALF_UP)


def shipping_cost(goods, region):
    """Shipping to a region: free when the goods come to 50.00 or more."""
    if region not in SHIPPING:
        raise ValueError(f"we don't ship to {region!r}")
    if goods >= FREE_SHIPPING_FROM:
        return Decimal("0.00")
    return SHIPPING[region]


def quote(cart, prices, region, coupon=None, today=None):
    """Price a basket: the goods, the coupon discount, shipping, and VAT on all of it."""
    today = today or date.today()
    subtotal = goods_subtotal(cart, prices)
    discount = coupon_discount(coupon, subtotal, today)
    shipping = shipping_cost(subtotal - discount, region)
    taxable = subtotal - discount + shipping
    vat = (taxable * VAT_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)
    return Quote(subtotal, discount, shipping, vat, taxable + vat)


def fetch_rate(currency):
    """How much of a currency one pound buys, from the rates service. A network call."""
    with urlopen(RATES_URL.format(currency=currency), timeout=5) as response:
        return Decimal(str(json.load(response)["rates"][currency]))


def convert_total(total, currency):
    """A total in another currency, rounded half-up to the cent. GBP is returned as it is."""
    if currency == "GBP":
        return total
    return (total * fetch_rate(currency)).quantize(PENNY, rounding=ROUND_HALF_UP)


def print_quote(q):
    """Print a quote the way the order confirmation email shows it."""
    print(f"Goods     {q.subtotal:>9.2f}")
    if q.discount:
        print(f"Discount  {-q.discount:>9.2f}")
    shipping = "FREE" if q.shipping == 0 else f"{q.shipping:.2f}"
    print(f"Shipping  {shipping:>9}")
    print(f"VAT       {q.vat:>9.2f}")
    print(f"Total     {q.total:>9.2f}")
