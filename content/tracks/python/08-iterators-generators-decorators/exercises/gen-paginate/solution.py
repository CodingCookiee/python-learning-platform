def paginate(fetch_page):
    """Yield every item from every page, fetching each page only when it's needed."""
    cursor = None
    while True:
        page = fetch_page(cursor)
        for item in page["items"]:
            yield item
        cursor = page["next_cursor"]
        if cursor is None:
            return
