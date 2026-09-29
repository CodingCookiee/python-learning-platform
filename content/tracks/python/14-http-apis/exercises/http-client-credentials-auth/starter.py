import base64
import time

import httpx


class ClientCredentialsAuth(httpx.Auth):
    """OAuth 2 client credentials: fetches, reuses and refreshes a bearer token."""

    def __init__(self, token_url, client_id, client_secret, *, scope=None, clock=time.monotonic):
        ...

    def auth_flow(self, request):
        yield request
