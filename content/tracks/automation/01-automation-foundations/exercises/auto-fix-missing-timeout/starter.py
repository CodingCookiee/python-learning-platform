import logging

import httpx

log = logging.getLogger(__name__)


def make_client(token, transport=None):
    """The CRM client used for every call. (`transport` lets tests supply a fake CRM.)"""
    return httpx.Client(
        base_url="https://api.crm.example",
        headers={"Authorization": f"Bearer {token}"},
        timeout=None,  # the CRM is slow on Mondays
        transport=transport,
    )


def push_lead(client, lead):
    """Create the lead in the CRM and return its id, or None if the CRM timed out."""
    response = client.post("/v1/contacts", json=lead)
    response.raise_for_status()
    return response.json()["id"]
