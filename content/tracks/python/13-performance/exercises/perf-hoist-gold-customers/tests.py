from plp import test, hidden
from solution import gold_order_ids

# Built once when the tests load, so none of this counts against your time
TIERS = ["bronze", "silver", "gold", "silver", "bronze"]
CUSTOMERS = [{"id": f"C-{n:05d}", "tier": TIERS[n * 3 % 5]} for n in range(3_000)]
ORDERS = [{"id": f"ORD-{n:05d}", "customer_id": f"C-{n * 11 % 3_000:05d}"} for n in range(3_000)]
GOLD = {customer["id"] for customer in CUSTOMERS if customer["tier"] == "gold"}
EXPECTED = [order["id"] for order in ORDERS if order["customer_id"] in GOLD]


@test("Finds the orders from gold customers")
def _():
    customers = [
        {"id": "C-1", "tier": "gold"},
        {"id": "C-2", "tier": "silver"},
        {"id": "C-3", "tier": "gold"},
    ]
    orders = [
        {"id": "ORD-1", "customer_id": "C-2"},
        {"id": "ORD-2", "customer_id": "C-3"},
        {"id": "ORD-3", "customer_id": "C-1"},
    ]
    assert gold_order_ids(orders, customers) == ["ORD-2", "ORD-3"]


@test("Handles 3 000 orders from 3 000 customers in time")
def _():
    assert gold_order_ids(ORDERS, CUSTOMERS) == EXPECTED


@test("Keeps every gold order, repeats included, in order")
def _():
    customers = [{"id": "C-1", "tier": "gold"}, {"id": "C-2", "tier": "bronze"}]
    orders = [
        {"id": "ORD-7", "customer_id": "C-1"},
        {"id": "ORD-8", "customer_id": "C-2"},
        {"id": "ORD-9", "customer_id": "C-1"},
    ]
    assert gold_order_ids(orders, customers) == ["ORD-7", "ORD-9"]


@hidden("No gold customers, or no orders")
def _():
    assert gold_order_ids(ORDERS[:5], [{"id": "C-00000", "tier": "silver"}]) == []
    assert gold_order_ids([], CUSTOMERS) == []
