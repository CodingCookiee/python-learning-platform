import base64
import time

import httpx

EXPIRY_MARGIN = 30


class ClientCredentialsAuth(httpx.Auth):
    """OAuth 2 client credentials: fetches, reuses and refreshes a bearer token."""

    requires_response_body = True

    def __init__(self, token_url, client_id, client_secret, *, scope=None, clock=time.monotonic):
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.scope = scope
        self.clock = clock
        self.token = None
        self.expires_at = 0.0

    def auth_flow(self, request):
        if self.token is None or self.clock() >= self.expires_at:
            yield from self._fetch_token()
        request.headers["Authorization"] = f"Bearer {self.token}"
        response = yield request

        if response.status_code == 401:
            yield from self._fetch_token()
            request.headers["Authorization"] = f"Bearer {self.token}"
            yield request

    def _fetch_token(self):
        form = {"grant_type": "client_credentials"}
        if self.scope is not None:
            form["scope"] = self.scope
        credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode("ascii")
        response = yield httpx.Request(
            "POST", self.token_url, data=form, headers={"Authorization": f"Basic {credentials}"}
        )
        response.raise_for_status()
        token = response.json()
        self.token = token["access_token"]
        self.expires_at = self.clock() + token["expires_in"] - EXPIRY_MARGIN
