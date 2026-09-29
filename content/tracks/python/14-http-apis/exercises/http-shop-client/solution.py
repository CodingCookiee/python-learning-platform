import httpx


def make_client(transport=None):
    """An httpx.Client for the shop API, with its base URL, default headers and timeouts."""
    return httpx.Client(
        base_url="https://api.shop.example/v2",
        headers={"Accept": "application/json", "User-Agent": "millstone-sync/1.0"},
        timeout=httpx.Timeout(10, connect=3),
        transport=transport,
    )
