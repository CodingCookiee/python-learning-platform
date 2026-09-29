Products, shipping options and gift cards are unrelated classes, but they all have a price in cents:
`Product` is a frozen dataclass, `ShippingOption` computes its price with a property, and `GiftCard`
stores it as a plain attribute. Define a `Priced` protocol that all three satisfy as they are, and
two fully typed functions:

- `cheapest(items)` returns the item with the lowest `price_cents` (the first one on a tie), and
  raises `ValueError("nothing to compare")` when there are no items. mypy must know that the cheapest
  of some `Product`s is a `Product`, not just "something priced".
- `total_price(items)` returns the sum of their prices, for any mix of priced things.

```python
cheapest([Product("Mug", 800), Product("Beans", 2450)])   # Product(name='Mug', price_cents=800)
cheapest([ShippingOption("Next day", 599, 200), ShippingOption("Standard", 399, 0)]).label  # "Standard"
total_price([Product("Mug", 800), ShippingOption("Next day", 599, 200), GiftCard("GC-1", 2500)])  # 4099
```

Don't change the three classes. `mypy --strict` must pass, and mypy must reject things without a
price.
