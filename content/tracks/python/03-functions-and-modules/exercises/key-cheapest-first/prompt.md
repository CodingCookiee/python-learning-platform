Write `cheapest_first(products)` that returns a new list of the product dicts, sorted by `"price"`
from lowest to highest. Products with the same price keep their original order, and the list you
were given is not changed.

```python
products = [
    {"name": "Desk lamp", "price": 34.0},
    {"name": "Notebook", "price": 4.5},
    {"name": "Mug", "price": 9.0},
]
[p["name"] for p in cheapest_first(products)]
# ["Notebook", "Mug", "Desk lamp"]
```
