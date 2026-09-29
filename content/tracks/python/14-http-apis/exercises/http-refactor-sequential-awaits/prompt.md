`fetch_stock_levels` works, but it awaits each request before starting the next, so 400 SKUs take
400 round trips. The warehouse API is happy to take all of this batch at once (batches are at most
50 SKUs, so no limit is needed here).

Refactor it so that all the requests are in flight at the same time. It must still:

- return a dict of `{sku: available}` in the order of `skus`, whatever order the answers arrive in,
- raise when a request fails (either the `httpx.HTTPStatusError` itself, or an `ExceptionGroup`
  containing it if you use a `TaskGroup`).

```python
await fetch_stock_levels(client, ["MUG-STN", "ETH-1KG", "V60-100"])
# {"MUG-STN": 5, "ETH-1KG": 6, "V60-100": 0}, with all three requests in flight together
```
