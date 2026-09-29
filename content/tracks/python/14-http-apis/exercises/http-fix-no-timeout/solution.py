import httpx

EXPORT_TIMEOUT = httpx.Timeout(60, connect=3)


def make_client(transport=None):
    """The client for the CRM's reporting API."""
    return httpx.Client(base_url="https://reports.crm.example", timeout=httpx.Timeout(10, connect=3), transport=transport)


def fetch_export(client, report_id):
    """Download one export as JSON, or None if it timed out."""
    try:
        response = client.get(f"/v1/exports/{report_id}", timeout=EXPORT_TIMEOUT)
    except httpx.TimeoutException:
        return None
    response.raise_for_status()
    return response.json()
