`inventory` maps SKUs to how many units are on the shelf. Write `stock_level(inventory, sku)` that
returns the count for `sku`, or `0` if the SKU isn't in the inventory at all:

```python
inventory = {"MUG-01": 12, "TEE-02": 0, "CAP-03": 7}
stock_level(inventory, "CAP-03")   # 7
stock_level(inventory, "HAT-09")   # 0
```

Looking up an unknown SKU must not add it to the inventory.
