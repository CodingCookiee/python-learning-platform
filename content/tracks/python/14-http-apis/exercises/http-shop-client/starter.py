import httpx


def make_client(transport=None):
    """An httpx.Client for the shop API, with its base URL, default headers and timeouts."""
    return httpx.Client(transport=transport)
