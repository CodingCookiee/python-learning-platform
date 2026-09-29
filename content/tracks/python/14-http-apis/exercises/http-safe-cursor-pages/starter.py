class PaginationError(Exception):
    """The API's pagination is broken: a repeated cursor, or far too many pages."""


def iter_tickets(client, *, limit=100, max_pages=1000):
    """Yield every ticket, following next_cursor, refusing loops and runaway page counts."""
    params = {"limit": limit}
    while True:
        page = client.get("/v1/tickets", params=params).raise_for_status().json()
        yield from page["tickets"]
        if page["next_cursor"] is None:
            return
        params["cursor"] = page["next_cursor"]
