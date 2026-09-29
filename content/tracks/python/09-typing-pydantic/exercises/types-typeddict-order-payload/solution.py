from typing import NotRequired, TypedDict


class LineItem(TypedDict):
    sku: str
    quantity: int
    unit_price_cents: int


class OrderPayload(TypedDict):
    order_id: str
    lines: list[LineItem]
    coupon: NotRequired[str]


def order_total(order: OrderPayload) -> int:
    """The order's total in cents, after any coupon."""
    subtotal = sum(line["quantity"] * line["unit_price_cents"] for line in order["lines"])
    if order.get("coupon") == "WELCOME10":
        return subtotal - subtotal // 10
    return subtotal
