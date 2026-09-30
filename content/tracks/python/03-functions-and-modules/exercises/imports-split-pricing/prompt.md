The checkout used to be one long file. The pricing rules now live in their own module, `pricing.py`,
so the shop's other scripts can share them. Finish both files.

**In `pricing.py`:**

- `with_vat(net)` returns `net` plus VAT at the module's `VAT_RATE`, rounded to cents.
- `bulk_discount(net, quantity)` takes 10% off a line's net price when `quantity` is 10 or more,
  rounded to cents, and returns `net` unchanged otherwise.

**In `main.py`:** `basket_total(items)` takes `(name, unit_price, quantity)` tuples and returns the
total to pay: each line's net price with its bulk discount, then VAT added once to the sum.

```python
basket_total([("tea", 2.5, 4), ("mug", 8.0, 1)])   # 21.6   (18.0 net + 20% VAT)
basket_total([("pen", 1.0, 10)])                    # 10.8   (10.0, 10% off, then VAT)
```

`main.py` must **import** the rules from `pricing`, not copy them: a VAT change should only ever need
editing in one place. Switch between the files with the tabs above the editor.
