import httpx

BASE_URL = "https://api.helpdesk.example/v2"


def get_ticket(api_key, ticket_id, transport=None):
    client = httpx.Client(
        base_url=BASE_URL,
        headers={"Authorization": f"Bearer {api_key}", "User-Agent": "support-bot/2.1"},
        timeout=httpx.Timeout(10, connect=3),
        transport=transport,
    )
    return client.get(f"/tickets/{ticket_id}").json()


def list_open_tickets(api_key, transport=None):
    client = httpx.Client(
        base_url=BASE_URL,
        headers={"Authorization": f"Bearer {api_key}", "User-Agent": "support-bot/2.1"},
        timeout=httpx.Timeout(10, connect=3),
        transport=transport,
    )
    response = client.get("/tickets", params={"status": "open"})
    response.raise_for_status()
    return response.json()["tickets"]


def close_ticket(api_key, ticket_id, transport=None):
    client = httpx.Client(base_url=BASE_URL, headers={"Authorization": f"Bearer {api_key}"}, transport=transport)
    response = client.patch(f"/tickets/{ticket_id}", json={"status": "closed"})
    response.raise_for_status()
    return response.json()
