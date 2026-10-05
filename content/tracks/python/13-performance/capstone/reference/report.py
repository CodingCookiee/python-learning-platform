"""Quarterly order report for Harbour & Hull Coffee.

Fast version: every section of the report now comes from one pass over the orders, with dict and
set lookups built once per call. NOTES.md explains each change and what it saved.

    python report.py                       # print the report for the sample quarter
    python report.py --orders 1000         # a smaller sample, for quick experiments
    python report.py --time                # also print how long build_report took, on stderr
    python report.py --time --repeat 5     # the best of five runs, once it's fast
"""

import argparse
import random
import sys
import time
from collections import Counter
from datetime import date, timedelta

REGIONS = {
    "GB": "UK and Ireland",
    "IE": "UK and Ireland",
    "FR": "Western Europe",
    "BE": "Western Europe",
    "NL": "Western Europe",
    "DE": "Central Europe",
    "AT": "Central Europe",
    "CH": "Central Europe",
    "ES": "Southern Europe",
    "IT": "Southern Europe",
    "PT": "Southern Europe",
    "SE": "Nordics",
    "DK": "Nordics",
    "NO": "Nordics",
    "FI": "Nordics",
}

# VAT in percent, pasted from the finance system's export
VAT_TABLE = """\
GB 20
IE 23
FR 20
BE 21
NL 21
DE 19
AT 20
CH 8
ES 21
IT 22
PT 23
SE 25
DK 25
NO 25
FI 25
"""

CARRIERS = ["Parcelwise", "SwiftPost", "Northline Freight"]

# Days the warehouse doesn't ship
HOLIDAYS = {date(2026, 7, 13), date(2026, 8, 3), date(2026, 8, 31), date(2026, 9, 21)}


# Sample data ---------------------------------------------------------------


def make_sample(order_count=5_000, seed=2026):
    """Products, customers, orders and discontinued SKUs for July to September 2026.

    The data is random but repeatable: the same arguments always give the same data.
    """
    rng = random.Random(seed)

    roasts = [
        "Ethiopia Yirgacheffe",
        "Colombia Huila",
        "Guatemala Antigua",
        "Kenya Nyeri",
        "Brazil Cerrado",
        "Sumatra Mandheling",
        "Costa Rica Tarrazu",
        "Rwanda Nyamasheke",
    ]
    sizes = [("250 g", 650), ("500 g", 1_150), ("1 kg", 2_050)]
    products = []
    for n in range(2_000):
        size, base_cents = sizes[n % 3]
        products.append(
            {
                "sku": f"HH-{n:04d}",
                "name": f"{roasts[n % len(roasts)]}, {size}, lot {n // 24 + 1}",
                "unit_cents": base_cents + rng.randrange(0, 400, 5),
            }
        )
    skus = [product["sku"] for product in products]
    discontinued = sorted(rng.sample(skus, 300))

    countries = list(REGIONS)
    customers = [
        {"id": f"C-{n:05d}", "name": f"Customer {n:05d}", "country": rng.choice(countries)} for n in range(5_000)
    ]
    customer_ids = [customer["id"] for customer in customers]
    regulars = customer_ids[:600]  # a few hundred regulars place a lot of the orders

    first_day = date(2026, 7, 1)
    orders = []
    for n in range(order_count):
        placed = first_day + timedelta(days=rng.randrange(92))
        shipped = placed + timedelta(days=rng.randint(1, 9))
        orders.append(
            {
                "id": f"ORD-{n:06d}",
                "customer_id": rng.choice(regulars if rng.random() < 0.4 else customer_ids),
                "placed": placed.isoformat(),
                "shipped": shipped.isoformat(),
                "carrier": rng.choice(CARRIERS),
                "lines": [(rng.choice(skus), rng.randint(1, 6)) for _ in range(rng.randint(1, 4))],
            }
        )
    return products, customers, orders, discontinued


# Helpers ---------------------------------------------------------------------


def parse_day(text):
    """A date from its ISO text, e.g. "2026-07-01"."""
    return date.fromisoformat(text)


def vat_rates():
    """VAT for every country in VAT_TABLE, in percent."""
    return {code: int(rate) for code, rate in (line.split() for line in VAT_TABLE.splitlines())}


def business_days(start, end):
    """Working days after start, up to and including end."""
    days = 0
    current = start
    while current < end:
        current += timedelta(days=1)
        if current.weekday() < 5 and current not in HOLIDAYS:
            days += 1
    return days


def money(cents):
    return f"{cents / 100:,.2f}"


# The report ----------------------------------------------------------------


def build_report(products, customers, orders, discontinued):
    """The quarterly report, as one string."""
    # Lookups built once per call: a dict per question the loops used to answer by scanning a list
    unit_cents = {product["sku"]: product["unit_cents"] for product in products}
    product_names = {product["sku"]: product["name"] for product in products}
    country_of = {customer["id"]: customer["country"] for customer in customers}
    vat = vat_rates()
    discontinued = set(discontinued)
    days_between = {}  # (placed, shipped) -> business days; a few hundred pairs cover every order

    # One pass over the orders collects everything every section needs
    revenue = 0
    by_region = {}
    product_revenue = {}
    orders_per_customer = Counter()
    carrier_days = {carrier: [0, 0] for carrier in CARRIERS}  # total days, orders
    affected = 0
    by_day = {}  # ISO date -> [orders, cents]
    for order in orders:
        total = 0
        for sku, quantity in order["lines"]:
            cents = unit_cents[sku] * quantity
            total += cents
            product_revenue[sku] = product_revenue.get(sku, 0) + cents
        revenue += total

        country = country_of[order["customer_id"]]
        region = REGIONS[country]
        by_region[region] = by_region.get(region, 0) + total * 100 // (100 + vat.get(country, 0))

        orders_per_customer[order["customer_id"]] += 1

        pair = (order["placed"], order["shipped"])
        if pair not in days_between:
            days_between[pair] = business_days(parse_day(pair[0]), parse_day(pair[1]))
        totals = carrier_days.setdefault(order["carrier"], [0, 0])
        totals[0] += days_between[pair]
        totals[1] += 1

        if any(sku in discontinued for sku, _ in order["lines"]):
            affected += 1

        day = by_day.setdefault(order["placed"], [0, 0])
        day[0] += 1
        day[1] += total

    # ISO dates sort as strings, so min and max need no parsing
    first = parse_day(min(by_day))
    last = parse_day(max(by_day))

    lines = [
        "Harbour & Hull Coffee: quarterly order report",
        f"{first:%d %b %Y} to {last:%d %b %Y}",
        "",
        f"Orders   {len(orders):>12,}",
        f"Revenue  {money(revenue):>12} GBP including VAT",
        f"Average  {money(revenue // len(orders)):>12} GBP per order",
        "",
        "Revenue by region, excluding VAT",
    ]
    for region in sorted(by_region, key=lambda name: (-by_region[name], name)):
        lines.append(f"  {region:<18}{money(by_region[region]):>14}")
    lines += ["", "Top 10 products by revenue"]
    ranked = sorted(product_revenue.items(), key=lambda item: (-item[1], item[0]))[:10]
    for rank, (sku, cents) in enumerate(ranked, start=1):
        lines.append(f"  {rank:>2}. {sku}  {product_names[sku]:<38}{money(cents):>12}")
    lines.append("")

    seen = len(orders_per_customer)
    returning = sum(1 for count in orders_per_customer.values() if count > 1)
    lines += [
        "Customers",
        f"  Ordered at least once {seen:>8,}",
        f"  Ordered again         {returning:>8,}  ({returning / seen:.1%})",
        "",
        "Business days from order to dispatch, by carrier",
    ]
    for carrier in CARRIERS:
        days, count = carrier_days[carrier]
        lines.append(f"  {carrier:<18}{days / count:>6.2f}   ({count:,} orders)")
    lines += ["", f"Orders with a discontinued product: {affected:,}", "", "Revenue by day"]

    day = first
    while day <= last:
        count, total = by_day.get(day.isoformat(), (0, 0))
        lines.append(f"  {day:%a %d %b}  {count:>4} orders  {money(total):>12}")
        day += timedelta(days=1)

    return "\n".join(lines) + "\n"


def main(argv=None):
    parser = argparse.ArgumentParser(description="Print the quarterly order report.")
    parser.add_argument("--orders", type=int, default=5_000, help="how many sample orders to generate")
    parser.add_argument("--time", action="store_true", help="time build_report and print the time on stderr")
    parser.add_argument("--repeat", type=int, default=1, help="with --time, run it this many times and keep the best")
    args = parser.parse_args(argv)

    data = make_sample(args.orders)
    runs = []
    for _ in range(max(args.repeat, 1) if args.time else 1):
        start = time.perf_counter()
        report = build_report(*data)
        runs.append(time.perf_counter() - start)
    if args.time:
        print(f"build_report: best of {len(runs)}: {min(runs):.3f} s", file=sys.stderr)
    print(report, end="")


if __name__ == "__main__":
    main()
