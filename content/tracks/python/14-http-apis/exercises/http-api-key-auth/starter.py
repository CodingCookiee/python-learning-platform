import httpx


class ApiKeyAuth(httpx.Auth):
    """Adds an API key header, but only to requests for one host."""

    def __init__(self, key, *, host, header="X-API-Key"):
        ...

    def auth_flow(self, request):
        yield request
