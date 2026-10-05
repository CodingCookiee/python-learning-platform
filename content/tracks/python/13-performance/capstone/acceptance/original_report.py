# The starter's report.py, unchanged: the acceptance tests compare your build_report with this one.
"""Quarterly order report for Harbour & Hull Coffee.

It's correct, and it's slow. Make build_report at least 20 times faster without changing a single
character of what it prints. The brief explains how to measure it and what to hand in.

    python report.py                       # print the report for the sample quarter
    python report.py --orders 1000         # a smaller sample, for quick experiments
    python report.py --time                # also print how long build_report took, on stderr
    python report.py --time --repeat 5     # the best of five runs, once it's fast
"""

import argparse
import random
import sys
import time
from datetime import date, datetime, timedelta

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
    return datetime.strptime(text, "%Y-%m-%d").date()


def find_product(products, sku):
    for product in products:
        if product["sku"] == sku:
            return product
    raise KeyError(sku)


def find_customer(customers, customer_id):
    for customer in customers:
        if customer["id"] == customer_id:
            return customer
    raise KeyError(customer_id)


def vat_rate(country):
    """VAT for a country, in percent."""
    for line in VAT_TABLE.splitlines():
        code, rate = line.split()
        if code == country:
            return int(rate)
    return 0


def order_total(order, products):
    """What the customer paid, in cents, including VAT."""
    total = 0
    for sku, quantity in order["lines"]:
        total += find_product(products, sku)["unit_cents"] * quantity
    return total


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
    report = ""

    # Summary
    first = min(parse_day(order["placed"]) for order in orders)
    last = max(parse_day(order["placed"]) for order in orders)
    revenue = 0
    for order in orders:
        revenue = revenue + order_total(order, products)
    report = report + "Harbour & Hull Coffee: quarterly order report\n"
    report = report + f"{first:%d %b %Y} to {last:%d %b %Y}\n\n"
    report = report + f"Orders   {len(orders):>12,}\n"
    report = report + f"Revenue  {money(revenue):>12} GBP including VAT\n"
    report = report + f"Average  {money(revenue // len(orders)):>12} GBP per order\n\n"

    # Revenue by region, excluding VAT
    by_region = {}
    for order in orders:
        customer = find_customer(customers, order["customer_id"])
        net = order_total(order, products) * 100 // (100 + vat_rate(customer["country"]))
        region = REGIONS[customer["country"]]
        by_region[region] = by_region.get(region, 0) + net
    report = report + "Revenue by region, excluding VAT\n"
    for region in sorted(by_region, key=lambda name: (-by_region[name], name)):
        report = report + f"  {region:<18}" + f"{money(by_region[region]):>14}" + "\n"
    report = report + "\n"

    # Best sellers
    product_revenue = {}
    for order in orders:
        for sku, quantity in order["lines"]:
            product = find_product(products, sku)
            product_revenue[sku] = product_revenue.get(sku, 0) + product["unit_cents"] * quantity
    report = report + "Top 10 products by revenue\n"
    remaining = dict(product_revenue)
    for rank in range(1, 11):
        ranked = sorted(remaining.items(), key=lambda item: (-item[1], item[0]))
        sku, cents = ranked[0]
        del remaining[sku]
        name = find_product(products, sku)["name"]
        report = report + f"  {rank:>2}. {sku}  {name:<38}" + f"{money(cents):>12}" + "\n"
    report = report + "\n"

    # Customers who came back
    seen = []
    returning = []
    for order in orders:
        customer_id = order["customer_id"]
        if customer_id in seen:
            if customer_id not in returning:
                returning.append(customer_id)
        else:
            seen.append(customer_id)
    report = report + "Customers\n"
    report = report + f"  Ordered at least once {len(seen):>8,}\n"
    report = report + f"  Ordered again         {len(returning):>8,}  ({len(returning) / len(seen):.1%})\n\n"

    # Shipping speed
    report = report + "Business days from order to dispatch, by carrier\n"
    for carrier in CARRIERS:
        days = []
        for order in orders:
            if order["carrier"] == carrier:
                days.append(business_days(parse_day(order["placed"]), parse_day(order["shipped"])))
        report = report + f"  {carrier:<18}{sum(days) / len(days):>6.2f}   ({len(days):,} orders)\n"
    report = report + "\n"

    # Discontinued products that are still selling
    affected = 0
    for order in orders:
        for sku, quantity in order["lines"]:
            if sku in discontinued:
                affected = affected + 1
                break
    report = report + f"Orders with a discontinued product: {affected:,}\n\n"

    # Day by day
    report = report + "Revenue by day\n"
    day = first
    while day <= last:
        count = 0
        total = 0
        for order in orders:
            if parse_day(order["placed"]) == day:
                count = count + 1
                total = total + order_total(order, products)
        report = report + f"  {day:%a %d %b}" + f"  {count:>4} orders" + f"  {money(total):>12}" + "\n"
        day = day + timedelta(days=1)

    return report


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
