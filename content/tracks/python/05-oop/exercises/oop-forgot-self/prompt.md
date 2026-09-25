This shopping cart class was written in a hurry and every method is broken. Fix it so that it
works like this:

```python
cart = Cart("Ada")
cart.owner                  # "Ada"
cart.add("Coffee beans", 12.5)
cart.add("Mug", 8.0)
cart.items                  # [("Coffee beans", 12.5), ("Mug", 8.0)]
cart.total()                # 20.5
```

Each cart must keep its own items. Keep the class's names and methods as they are: the bugs are
all about `self`.
