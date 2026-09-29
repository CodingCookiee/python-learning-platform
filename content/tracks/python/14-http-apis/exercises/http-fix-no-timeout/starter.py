import httpx


def make_client(transport=None):
    """The client for the CRM's reporting API."""
    # The weekly export is slow, so the timeout was switched off
    return httpx.Client(base_url="https://reports.crm.example", timeout=None, transport=transport)


def fetch_export(client, report_id):
    """Download one export as JSON."""
    response = client.get(f"/v1/exports/{report_id}")
    response.raise_for_status()
    return response.json()
