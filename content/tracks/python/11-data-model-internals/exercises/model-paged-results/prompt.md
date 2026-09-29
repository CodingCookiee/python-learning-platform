An orders API returns results a page at a time, and the reporting code wants to treat all of them
as one sequence without downloading everything up front. Write a class
`PagedResults(fetch_page, page_size)`:

- `fetch_page(n)` fetches page `n` (counting from 0) and returns `(items, total)`: that page's
  items, and the total number of items across all pages.
- `results[i]` fetches only the page that item `i` is on. Each page is fetched at most once.
- `len(results)` is the total, fetching page 0 only if no page has been fetched yet.
- Negative indices and slices work like a list's (a slice returns a list), and an index past the
  end raises `IndexError`.
- Iterating fetches pages one at a time, as it reaches them. `in`, `reversed()` and `.index()`
  work too.

```python
calls = []

def fetch_page(page):
    calls.append(page)
    start = page * 10
    return [f"ORD-{n:04}" for n in range(start, min(start + 10, 23))], 23

orders = PagedResults(fetch_page, page_size=10)
orders[12]       # 'ORD-0012'
calls            # [1]
len(orders)      # 23, and calls is still [1]
orders[-1]       # 'ORD-0022'
orders[8:11]     # ['ORD-0008', 'ORD-0009', 'ORD-0010']
calls            # [1, 2, 0]
```
