The shop keeps its stock code in a package, `inventory`, with the logic in `inventory/stock.py`
(read-only here). The team wants to write `from inventory import reorder`, without knowing which
module inside the package it lives in, but right now that import fails.

1. In `inventory/__init__.py`, make `reorder` and `LOW_STOCK` importable straight from the package.
2. In `main.py`, write `shopping_list(levels)`: the items to reorder, as `"name (have n)"` lines in the
   order `reorder` returns them.

```python
shopping_list({"tea": 1, "milk": 9, "coffee": 2})
# ["coffee (have 2)", "tea (have 1)"]
```

Don't copy the reorder logic into `main.py`: the package owns it.
