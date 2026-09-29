A checkout applies different taxes in different countries, and the rest of the code just wants
something it can call on a price. Write a class `TaxRate(name, percent)` whose instances are
callable: `rate(amount)` returns the amount with tax added, rounded to 2 decimal places.
`repr()` shows how it was made.

```python
vat = TaxRate("UK VAT", 20)
vat(10.00)                      # 12.0
vat(19.99)                      # 23.99
list(map(vat, [5.00, 2.50]))    # [6.0, 3.0]
vat                             # TaxRate('UK VAT', 20)
```
