from plp import hidden, test
from solution import group_orders


def line(order_id, sku, qty, unit_price, email="amira@example.com"):
    return {"json": {"order_id": order_id, "customer_email": email, "sku": sku, "qty": qty, "unit_price": unit_price}}


ITEMS = [
    line("SO-1042", "MUG-STN", 2, "12.50"),
    line("SO-1041", "ETH-1KG", 1, "14.20", "tom@example.com"),
    line("SO-1042", "V60-100", 1, "7.40"),
]


@test("Groups two orders from three lines")
def _():
    assert group_orders(ITEMS) == [
        {
            "json": {
                "order_id": "SO-1041",
                "customer_email": "tom@example.com",
                "lines": [{"sku": "ETH-1KG", "qty": 1}],
                "item_count": 1,
                "total": "14.20",
            },
            "pairedItem": [{"item": 1}],
        },
        {
            "json": {
                "order_id": "SO-1042",
                "customer_email": "amira@example.com",
                "lines": [{"sku": "MUG-STN", "qty": 2}, {"sku": "V60-100", "qty": 1}],
                "item_count": 3,
                "total": "32.40",
            },
            "pairedItem": [{"item": 0}, {"item": 2}],
        },
    ]


@test("Totals are exact to the penny")
def _():
    items = [line("SO-2001", "STICKER", 3, "0.10"), line("SO-2001", "PIN", 1, "0.20")]
    assert group_orders(items)[0]["json"]["total"] == "0.50"


@test("No items, no orders")
def _():
    assert group_orders([]) == []


@hidden("Cancelled lines are left out, and keep their index slot")
def _():
    items = [line("SO-3001", "MUG-STN", 0, "12.50"), line("SO-3001", "V60-100", 2, "7.40")]
    [order] = group_orders(items)
    assert order["json"]["lines"] == [{"sku": "V60-100", "qty": 2}]
    assert (order["json"]["item_count"], order["json"]["total"]) == (2, "14.80")
    assert order["pairedItem"] == [{"item": 1}]


@hidden("An order with only cancelled lines disappears")
def _():
    items = [line("SO-4001", "MUG-STN", 0, "12.50"), line("SO-4002", "PIN", 1, "2.00")]
    assert [o["json"]["order_id"] for o in group_orders(items)] == ["SO-4002"]


@hidden("Doesn't change the input items")
def _():
    items = [line("SO-5001", "MUG-STN", 1, "12.50")]
    group_orders(items)
    assert items == [line("SO-5001", "MUG-STN", 1, "12.50")]
