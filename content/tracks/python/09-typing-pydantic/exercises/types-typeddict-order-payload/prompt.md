Orders arrive from the storefront as JSON, parsed into plain dicts. Describe their shape with two
`TypedDict` classes so mypy can check every function that touches them:

- `LineItem` has `sku` (str), `quantity` (int) and `unit_price_cents` (int).
- `OrderPayload` has `order_id` (str), `lines` (a list of `LineItem`) and an optional `coupon`
  (str). The `coupon` key is often missing altogether.

Then write `order_total(order: OrderPayload) -> int`: the sum of quantity times unit price over the
lines. The coupon `WELCOME10` takes 10% off, with the discount rounded down to a whole cent. Any
other coupon is ignored.

```python
order = {"order_id": "A1042", "lines": [{"sku": "MUG-01", "quantity": 2, "unit_price_cents": 800}]}
order_total(order)                              # 1600
order_total({**order, "coupon": "WELCOME10"})   # 1440
```

`mypy --strict` must pass, and mypy must reject payloads with a missing key, a misspelled key or a
value of the wrong type.
