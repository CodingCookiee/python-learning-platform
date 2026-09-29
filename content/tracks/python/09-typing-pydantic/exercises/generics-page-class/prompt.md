Every list endpoint of the shop's API returns one page of results and a cursor for the next page.
Write one generic `Page[T]` dataclass that works for pages of orders, customers or anything else,
with the Python 3.12 syntax:

- `Page(items, next_cursor=None)`: `items` is a `list[T]`; `next_cursor` is a `str` or `None` on the
  last page.
- `page.has_more` is a read-only property: `True` when there's a next cursor.
- `page.first()` returns the first item, or `None` for an empty page.
- `page.map(fn)` returns a new `Page` of `fn(item)` for each item, with the same cursor. Mapping a
  `Page[str]` with `len` gives a `Page[int]`.

Then write `collect_all(pages)`, which takes any iterable of pages of the same type and returns one
list of all their items, in order.

```python
page = Page(["A1042", "A1043"], next_cursor="c2")
page.has_more                                  # True
page.first()                                   # "A1042"
page.map(len)                                  # Page(items=[5, 5], next_cursor='c2')
collect_all([page, Page(["A1044"])])           # ["A1042", "A1043", "A1044"]
```

`mypy --strict` must pass, and mypy must know that `page.first()` might be `None`.
