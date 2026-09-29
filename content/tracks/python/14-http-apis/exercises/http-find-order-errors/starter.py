import httpx


class OrderLookupError(Exception):
    """The shop couldn't tell us about an order."""


def find_order(client, order_id):
    """The order as a dict, or None if the shop has no such order."""
    return client.get(f"/orders/{order_id}").json()
