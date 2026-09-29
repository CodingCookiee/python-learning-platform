The sales assistant's `search_deals` tool returns every matching deal with every field, including
long internal notes. For a common word like "dental" that's 40,000 characters, resent on every step
after. Write:

```python
page_of(items, *, page=1, page_size=10, fields, max_page_size=25) -> dict
search_deals(query, page=1, page_size=10) -> dict
```

`page_of` returns one page of `items` (a list of dicts), keeping only the keys in `fields`:

```python
{"results": [...], "total": 42, "page": 2, "page_size": 10, "next_page": 3}
```

- `page` counts from 1; a page below 1 raises `ValueError`. A page past the end has no results.
- `page_size` is clamped to between 1 and `max_page_size`, and the clamped size is what's reported.
- `next_page` is the next page number, or `None` when this page reaches the end.

`search_deals` is the tool: it finds the deals in `DEALS` whose company contains `query`, ignoring
case, and returns `page_of` those with `fields=DEAL_FIELDS`.

```python
search_deals("dental", page=2)
# {"results": [{"id": "D-11", "company": "Bright Dental 11", "stage": "proposal", "value": 1211}, ...],
#  "total": 42, "page": 2, "page_size": 10, "next_page": 3}
```
