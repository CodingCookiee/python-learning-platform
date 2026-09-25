Write `make_formatter(symbol, *, decimals=2)` that **returns a function**. The returned function
takes an amount and formats it as money: the currency symbol, thousands separators, and exactly
`decimals` decimal places. A negative amount puts the minus sign before the symbol.

```python
gbp = make_formatter("£")
yen = make_formatter("¥", decimals=0)

gbp(1234.5)     # "£1,234.50"
yen(1500)       # "¥1,500"
gbp(-5)         # "-£5.00"
```

Each formatter remembers its own symbol and decimals.
