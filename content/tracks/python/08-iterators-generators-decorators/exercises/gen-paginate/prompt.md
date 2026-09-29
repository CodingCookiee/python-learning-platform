The CRM's API returns customers a page at a time. Each call to `fetch_page(cursor)` returns a dict
like `{"items": [...], "next_cursor": "c2"}`, where `next_cursor` is the cursor for the next page,
or `None` on the last page. The first page is fetched with `cursor=None`.

Write a generator function `paginate(fetch_page)` that yields every item from every page, in
order, as one stream:

- It fetches a page only when the caller has used up the previous one, so taking the first few
  customers costs one request, not a hundred.
- Calling `paginate(...)` makes no requests at all until the first item is asked for.
- A page can be empty and still have a `next_cursor`; keep going.

```python
pages = {
    None: {"items": ["ada", "grace"], "next_cursor": "c2"},
    "c2": {"items": ["linus"], "next_cursor": None},
}
list(paginate(lambda cursor: pages[cursor]))
# ["ada", "grace", "linus"]
```
