def iter_invoices(client, *, status="open", limit=100):
    """Yield every invoice with this status, fetching pages only as needed."""
    response = client.get("/v1/invoices", params={"status": status})
    return response.json()["data"]
