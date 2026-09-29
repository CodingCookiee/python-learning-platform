def iter_invoices(client, *, status="open", limit=100):
    """Yield every invoice with this status, fetching pages only as needed."""
    offset = 0
    while True:
        params = {"status": status, "offset": offset, "limit": limit}
        page = client.get("/v1/invoices", params=params).raise_for_status().json()
        yield from page["data"]
        offset += limit
        if offset >= page["total"] or not page["data"]:
            return
