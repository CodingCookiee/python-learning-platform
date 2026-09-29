import httpx

BASE_URL = "https://api.helpdesk.example/v2"


class HelpdeskClient:
    """The helpdesk API: one connection, one place for auth, timeouts and status checks."""

    def __init__(self, api_key, *, transport=None):
        self._http = httpx.Client(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {api_key}", "User-Agent": "support-bot/2.1"},
            timeout=httpx.Timeout(10, connect=3),
            transport=transport,
        )

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.close()

    def _request(self, method, path, **kwargs):
        response = self._http.request(method, path, **kwargs)
        response.raise_for_status()
        return response

    def get_ticket(self, ticket_id):
        return self._request("GET", f"/tickets/{ticket_id}").json()

    def list_open_tickets(self):
        return self._request("GET", "/tickets", params={"status": "open"}).json()["tickets"]

    def close_ticket(self, ticket_id):
        return self._request("PATCH", f"/tickets/{ticket_id}", json={"status": "closed"}).json()
