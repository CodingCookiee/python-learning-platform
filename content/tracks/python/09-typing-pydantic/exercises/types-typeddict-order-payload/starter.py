from typing import NotRequired, TypedDict

# LineItem: sku (str), quantity (int), unit_price_cents (int)
# OrderPayload: order_id (str), lines (a list of LineItem), and an optional coupon (str)


def order_total(order):
    """The order's total in cents, after any coupon."""
    ...
