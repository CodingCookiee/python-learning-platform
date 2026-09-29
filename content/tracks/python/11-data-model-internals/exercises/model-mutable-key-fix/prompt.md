A supplier changed one of its product codes, and after `rename()` the stock simply disappeared:

```python
book = StockBook()
book.add(Sku("mug-01"), 12)
book.rename(Sku("MUG-01"), "mug-02")

book.count(Sku("MUG-02"))   # 0   ← should be 12
book.count(Sku("MUG-01"))   # 0   ← correct, but only by accident
```

Fix it so the hash contract can't be broken again:

- A `Sku` can't be changed once it's made: assigning to `sku.code` raises `AttributeError`.
  Codes are still stored upper-case and compare case-insensitively.
- `rename(sku, new_code)` moves that product's stock to the new code. If the new code already has
  stock, the two counts are added together. Renaming a code with no stock does nothing.
