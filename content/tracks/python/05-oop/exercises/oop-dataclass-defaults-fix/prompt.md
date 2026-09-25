The `Cart` dataclass won't even load:

```text
ValueError: mutable default <class 'dict'> for field items is not allowed: use default_factory
```

And once you get past that, there's a second, quieter bug: every cart gets the same `cart_id`.

Fix both so that each cart gets its own empty `items` dict and its own id:

```python
first = Cart("Ada")
second = Cart("Grace")
first.add("MUG-01", 2)
first.items, second.items        # ({"MUG-01": 2}, {})
first.cart_id != second.cart_id  # True, e.g. "CART-0001" and "CART-0002"
```

Leave `next_cart_id` and `add` as they are.
