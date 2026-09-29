The orders API is paginated with cursors. `await client.page(cursor)` returns one page:

```python
{"orders": [{"id": "A-1"}, {"id": "A-2"}], "next": "c2"}     # "next" is None on the last page
```

The first page is `client.page(None)`. Write an async generator `iter_orders(client)` that yields
every order, from every page, in order. It must be lazy: fetch a page only when the orders before
it have been used up, so a caller that stops after the first few orders never fetches the rest.

```python
async for order in iter_orders(client):
    print(order["id"])       # A-1, A-2, A-3, ... across all the pages
```
