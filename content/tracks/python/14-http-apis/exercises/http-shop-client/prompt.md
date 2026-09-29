Write `make_client(transport=None)` that returns an `httpx.Client` set up for the Millstone shop
API, so that no function that uses it has to repeat any of this:

- base URL `https://api.shop.example/v2`,
- headers `Accept: application/json` and `User-Agent: millstone-sync/1.0` on every request,
- a timeout of 3 seconds to connect and 10 seconds for everything else,
- the given `transport` (tests pass a fake one; `None` means the real network).

```python
client = make_client()
client.base_url     # URL('https://api.shop.example/v2/')
client.timeout      # Timeout(connect=3, read=10, write=10, pool=10)
client.get("/orders", params={"status": "paid"})   # GET https://api.shop.example/v2/orders?status=paid
```
