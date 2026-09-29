Your file is `orders.py`. It works alongside `customers.py`, which the rest of the shop's code
imports first, and which you can't change:

```python norun
# customers.py
import orders


class Customer:
    def __init__(self, name):
        self.name = name
        self.orders = []

    def place_order(self, total):
        order = orders.Order(self, total)
        self.orders.append(order)
        return order
```

Every program that starts with `import customers` crashes:

```text
ImportError: cannot import name 'Customer' from partially initialized module 'customers'
(most likely due to a circular import)
```

Fix `orders.py` so that importing either module first works, and everything else behaves as
before:

```python norun
import customers
import orders

ada = customers.Customer("Ada")
ada.place_order(120)          # Order('Ada', 120)
orders.Order("Ada", 120)      # TypeError: an order needs a Customer
orders.total_spent(ada)       # 120
```
