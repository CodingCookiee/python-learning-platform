Every morning the shop re-prices its catalogue from the supplier's price API. Write the sync:

```python
prices, failed = await sync_prices(client, skus, *, limit=4, attempts=3, sleep=asyncio.sleep)
```

It sends `GET /v1/prices/<sku>` for every SKU (the answer is `{"sku": "MUG-STN", "price": "12.00"}`)
and returns two dicts, both in the order of `skus`:

- `prices` maps each SKU that succeeded to its price as a `Decimal`,
- `failed` maps each SKU that didn't to a reason: `"HTTP 404"` for an error status, or
  `"no response"` when the last attempt got no response at all.

The rules:

- At most `limit` requests are in flight at once.
- A transport error, or a `429`, `500`, `502`, `503` or `504`, is retried, up to `attempts`
  requests for that SKU. Before retrying, it waits (`await sleep(seconds)`) for the response's
  `Retry-After` seconds if it has one, or otherwise `2 ** attempt` seconds: 1, then 2, then 4.
- A SKU that's **waiting** to retry doesn't hold one of the `limit` slots, so the rest of the
  batch keeps moving.
- Any other status fails that SKU at once. One SKU failing never stops the others.

```python
prices, failed = await sync_prices(client, ["MUG-STN", "ETH-1KG", "GRD-HND", "DEC-250"], sleep=fake_sleep)
prices    # {"MUG-STN": Decimal("12.00"), "ETH-1KG": Decimal("21.50"), "DEC-250": Decimal("6.25")}
failed    # {"GRD-HND": "HTTP 404"}
waits     # [2.0]: ETH-1KG was rate limited once, with Retry-After: 2
```
