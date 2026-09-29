class PagedResults:
    """A read-only sequence over a paged API, fetching each page only when it's needed."""

    def __init__(self, fetch_page, page_size):
        ...
