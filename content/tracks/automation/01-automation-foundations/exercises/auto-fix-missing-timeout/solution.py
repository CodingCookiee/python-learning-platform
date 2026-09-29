import logging

import httpx

log = logging.getLogger(__name__)

CRM_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def make_client(token, transport=None):
    """The CRM client used for every call. (`transport` lets tests supply a fake CRM.)"""
    return httpx.Client(
        base_url="https://api.crm.example",
        headers={"Authorization": f"Bearer {token}"},
        timeout=CRM_TIMEOUT,
        transport=transport,
    )


def push_lead(client, lead):
    """Create the lead in the CRM and return its id, or None if the CRM timed out."""
    try:
        response = client.post("/v1/contacts", json=lead)
    except httpx.TimeoutException:
        log.warning("CRM request timed out for %s", lead["email"])
        return None
    response.raise_for_status()
    return response.json()["id"]
