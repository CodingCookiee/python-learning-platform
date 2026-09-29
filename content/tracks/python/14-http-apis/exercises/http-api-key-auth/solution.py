import httpx


class ApiKeyAuth(httpx.Auth):
    """Adds an API key header, but only to requests for one host."""

    def __init__(self, key, *, host, header="X-API-Key"):
        self.key = key
        self.host = host
        self.header = header

    def auth_flow(self, request):
        if request.url.host == self.host:
            request.headers[self.header] = self.key
        yield request

    def __repr__(self):
        hint = "..." + self.key[-4:] if len(self.key) > 8 else "***"
        return f"ApiKeyAuth(header={self.header!r}, host={self.host!r}, key={hint!r})"
