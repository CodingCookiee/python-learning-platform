Parsing the zone table was slow, so someone put `@cache` on `shipping_zones`. Checkout got faster,
and then customers started seeing this:

```python
checkout_zones("GB", express_available=True)
# ['mainland', 'highlands', 'islands', 'express']
checkout_zones("GB", express_available=True)
# ['mainland', 'highlands', 'islands', 'express', 'express']   ← should be the same as before
checkout_zones("GB", express_available=False)
# ['mainland', 'highlands', 'islands', 'express', 'express']   ← should have no express
```

Fix it, and keep the cache:

- `shipping_zones(country)` stays cached, and returns a **tuple**, so no caller can change the
  cached answer. An unknown country gives an empty tuple.
- `checkout_zones(country, express_available)` returns a new **list** every time, with
  `"express"` added at the end when it's available.
