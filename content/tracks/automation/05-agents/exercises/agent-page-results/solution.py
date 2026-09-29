DEAL_FIELDS = ("id", "company", "stage", "value")

DEALS = [
    {"id": f"D-{n}", "company": f"Bright Dental {n}" if n <= 42 else f"Kiln & Co branch {n}",
     "stage": "proposal" if n % 3 else "won", "value": 1200 + n,
     "owner_notes": "Internal: discount approved up to 15%. " * 20}
    for n in range(1, 61)
]


def page_of(items: list[dict], *, page: int = 1, page_size: int = 10, fields, max_page_size: int = 25) -> dict:
    """One page of items, with only the given fields, a total and the next page number."""
    if page < 1:
        raise ValueError(f"page starts at 1, got {page}")
    size = max(1, min(page_size, max_page_size))
    start = (page - 1) * size
    results = [{field: item[field] for field in fields} for item in items[start:start + size]]
    more = start + size < len(items)
    return {"results": results, "total": len(items), "page": page, "page_size": size,
            "next_page": page + 1 if more else None}


def search_deals(query: str, page: int = 1, page_size: int = 10) -> dict:
    """The tool: deals whose company contains the query, one page at a time."""
    matches = [deal for deal in DEALS if query.lower() in deal["company"].lower()]
    return page_of(matches, page=page, page_size=page_size, fields=DEAL_FIELDS)
