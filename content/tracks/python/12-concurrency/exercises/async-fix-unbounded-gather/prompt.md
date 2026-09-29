`sync_products(api, products)` pushes the shop's products to a storefront API and returns the ids
the API gives back, in the same order. It passed every test with three products. With the real
catalogue it fails:

```python
await sync_products(api, catalogue)     # 12 products
# RateLimited: 429 Too Many Requests (6 requests in flight, the limit is 5)
```

The storefront allows at most 5 requests in flight per API key. Fix `sync_products` so that it
never has more than `limit` requests in flight, where `limit` is a new keyword-only parameter
that defaults to 5. It must stay concurrent: with enough products, `limit` requests should be in
flight at once, not one at a time.

```python
await sync_products(api, catalogue)             # ["sf_1", "sf_2", ..., "sf_12"]
await sync_products(api, catalogue, limit=2)    # the same ids, two requests at a time
```
