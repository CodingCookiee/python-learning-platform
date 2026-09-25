An order form sends quantities as text. Write `parse_quantity(text, default=0)` that returns the
quantity as an `int`, or `default` if the text isn't a whole number.

```python
parse_quantity("3")               # 3
parse_quantity(" 12 ")            # 12
parse_quantity("three")           # 0
parse_quantity("", default=1)     # 1
```

Negative numbers are whole numbers too: `parse_quantity("-2")` is `-2`. Text like `"4.0"` isn't
a whole number, so it gets the default.
