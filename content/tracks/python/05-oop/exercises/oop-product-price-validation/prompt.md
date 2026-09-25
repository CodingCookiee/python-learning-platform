Write a `Product` class for a shop's catalogue that can never hold a nonsensical price or stock
level, however it's changed.

- `Product(name, price, stock=0)` stores all three.
- `price` is a property. Setting it to a negative number raises `ValueError`; otherwise it's
  stored rounded to 2 decimals.
- `stock` is a property. It must be a whole number (`int`) of zero or more, or it raises
  `ValueError`.
- `in_stock` is a read-only property: `True` when `stock` is more than zero.

The rules apply when the product is created and on every later assignment.

```python
mug = Product("Mug", 8.004, stock=3)
mug.price        # 8.0
mug.in_stock     # True
mug.stock = 0
mug.in_stock     # False
mug.price = -5   # ValueError
Product("Lamp", -1)   # ValueError
```
