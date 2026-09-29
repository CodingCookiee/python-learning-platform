from plp import test, hidden
from solution import revenue_by_country

# A month of data, built once when the tests load so it doesn't count against your time
COUNTRIES = ["GB", "DE", "FR", "NL", "IE", "ES"]
CUSTOMERS = [{"id": f"C-{n:05d}", "country": COUNTRIES[n * 7 % 6]} for n in range(4_000)]
ORDERS = [
    {"id": f"ORD-{n:05d}", "customer_id": f"C-{n * 13 % 4_100:05d}", "amount": n * 37 % 9_000 + 500}
    for n in range(8_000)
]
COUNTRY_OF = {customer["id"]: customer["country"] for customer in CUSTOMERS}
MONTH_TOTALS = {}
for order in ORDERS:
    country = COUNTRY_OF.get(order["customer_id"], "unknown")
    MONTH_TOTALS[country] = MONTH_TOTALS.get(country, 0) + order["amount"]


@test("Totals revenue by the customer's country")
def _():
    customers = [{"id": "C-1", "country": "GB"}, {"id": "C-2", "country": "DE"}]
    orders = [
        {"id": "ORD-1", "customer_id": "C-2", "amount": 4_500},
        {"id": "ORD-2", "customer_id": "C-1", "amount": 1_250},
        {"id": "ORD-3", "customer_id": "C-2", "amount": 800},
        {"id": "ORD-4", "customer_id": "C-9", "amount": 300},
    ]
    assert revenue_by_country(orders, customers) == {"DE": 5300, "GB": 1250, "unknown": 300}


@test("Handles a month of orders in time")
def _():
    assert revenue_by_country(ORDERS, CUSTOMERS) == MONTH_TOTALS


@test("Leaves countries with no orders out")
def _():
    customers = [{"id": "C-1", "country": "GB"}, {"id": "C-2", "country": "FR"}]
    orders = [{"id": "ORD-1", "customer_id": "C-1", "amount": 999}]
    assert revenue_by_country(orders, customers) == {"GB": 999}


@hidden("No orders means no revenue")
def _():
    assert revenue_by_country([], CUSTOMERS[:10]) == {}


@hidden("With no customers, everything is unknown")
def _():
    orders = [
        {"id": "ORD-1", "customer_id": "C-1", "amount": 200},
        {"id": "ORD-2", "customer_id": "C-2", "amount": 50},
    ]
    assert revenue_by_country(orders, []) == {"unknown": 250}
