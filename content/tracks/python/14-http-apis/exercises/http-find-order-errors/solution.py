import httpx


class OrderLookupError(Exception):
    """The shop couldn't tell us about an order."""


def find_order(client, order_id):
    """The order as a dict, or None if the shop has no such order."""
    try:
        response = client.get(f"/orders/{order_id}")
    except httpx.TimeoutException as error:
        raise OrderLookupError(f"order {order_id}: timed out") from error
    except httpx.TransportError as error:
        raise OrderLookupError(f"order {order_id}: can't reach the shop") from error

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            return None
        raise OrderLookupError(f"order {order_id}: HTTP {error.response.status_code}") from error

    try:
        return response.json()
    except ValueError as error:
        raise OrderLookupError(f"order {order_id}: response wasn't JSON") from error
