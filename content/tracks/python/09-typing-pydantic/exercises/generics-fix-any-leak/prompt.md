`index_by` passes `mypy --strict`, and still let this bug reach production:

```python
orders = [Order("A1042", "ada@example.com", 1600)]
by_id = index_by(orders, lambda order: order.order_id)
by_id["A1042"].totl       # AttributeError at runtime; mypy said nothing
```

Every hint on `index_by` is `Any`, so whatever goes in comes out as `Any`, and mypy stops checking
everything downstream. Make `index_by` generic, so that indexing a list of `Order` by a `str` key
gives a `dict[str, Order]` and mypy catches the typo. Keep its behaviour, including the
`ValueError` for a duplicate key, and don't leave any `Any` in the file.
