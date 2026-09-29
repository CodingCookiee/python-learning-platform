class PaginationError(Exception):
    """The API's pagination is broken: a repeated cursor, or far too many pages."""


def iter_tickets(client, *, limit=100, max_pages=1000):
    """Yield every ticket, following next_cursor, refusing loops and runaway page counts."""
    params = {"limit": limit}
    fetched = set()
    pages = 0
    while True:
        page = client.get("/v1/tickets", params=params).raise_for_status().json()
        pages += 1
        yield from page["tickets"]

        cursor = page["next_cursor"]
        if cursor is None:
            return
        if cursor in fetched:
            raise PaginationError(f"cursor {cursor!r} was already fetched")
        if pages >= max_pages:
            raise PaginationError(f"more than {max_pages} pages")
        fetched.add(cursor)
        params["cursor"] = cursor
