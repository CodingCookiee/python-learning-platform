Two customers can check out the last mug at the same moment. Write
`reserve_stock(conn, sku, quantity)`, which takes `quantity` units of `sku` out of stock if there
are enough and returns `True`, or changes nothing and returns `False` if there aren't (or the SKU
doesn't exist). A `quantity` below 1 raises `ValueError`.

```python
reserve_stock(conn, "MUG-STN", 2)    # True: 3 left
reserve_stock(conn, "MUG-STN", 5)    # False: still 3
```

The reservation must be committed when the function returns, and it must be safe when two
requests run at once: don't read the stock level into Python first. The table is
`stock (sku TEXT PRIMARY KEY, on_hand INTEGER NOT NULL)`.
