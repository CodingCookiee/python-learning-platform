`StockLevels` wraps a dict of units in stock per SKU, and indexing works. Everything else that
touches it fails:

```python
levels = StockLevels({"MUG-01": 12, "TEA-50": 3, "LAMP-02": 0})
levels["MUG-01"]                              # 12
restock_message(levels, "TEA-50")             # KeyError: 0   ← should be "TEA-50: 3 in stock"
levels.low_stock(5)                           # KeyError: 0   ← should be ['LAMP-02', 'TEA-50']
restock_message(StockLevels({}), "TEA-50")    # KeyError: 0   ← should be "No stock data loaded"
```

Fix `StockLevels` so that `in` checks for a SKU, iterating gives the SKUs, `len()` counts them,
and an empty table is falsy. `in` should be a dict lookup, not a scan: the real table has
thousands of SKUs. Don't change `restock_message` or `low_stock`.
