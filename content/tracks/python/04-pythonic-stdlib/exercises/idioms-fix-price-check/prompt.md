`parse_price(text)` turns price text from a supplier's spreadsheet into a `float`, or returns
`None` if the text isn't a price. It checks the text before converting it, and the check is wrong
in both directions:

```python
parse_price("12.50")     # 12.5, fine
parse_price("1.2.3")     # crashes with ValueError instead of returning None
parse_price("-4.50")     # None, but refunds are negative prices: should be -4.5
parse_price(" 9.99 ")    # None, but float() reads it fine: should be 9.99
```

Rewrite it so that it can't disagree with `float()`, and never crashes on text.
