DEAL_FIELDS = ("id", "company", "stage", "value")

DEALS = [
    {"id": f"D-{n}", "company": f"Bright Dental {n}" if n <= 42 else f"Kiln & Co branch {n}",
     "stage": "proposal" if n % 3 else "won", "value": 1200 + n,
     "owner_notes": "Internal: discount approved up to 15%. " * 20}
    for n in range(1, 61)
]


def page_of(items, *, page=1, page_size=10, fields, max_page_size=25):
    """One page of items, with only the given fields, a total and the next page number."""
    ...


def search_deals(query, page=1, page_size=10):
    """The tool: deals whose company contains the query, one page at a time."""
    return [deal for deal in DEALS if query.lower() in deal["company"].lower()]
