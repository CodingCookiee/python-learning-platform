The receipt printer (this module's capstone) reads each item as one line: name, quantity and unit
price, separated by commas. Write the part that understands one of those lines.

**1. `parse_item(line)`** returns the three parts, with the name stripped of surrounding spaces, the
quantity as an `int` and the unit price as a `Decimal`:

```python
parse_item("Coffee beans, 2, 8.50")   # ("Coffee beans", 2, Decimal("8.50"))
```

**2. The main block**, under the `if __name__ == "__main__":` guard that's already in the starter,
reads one line with `input()`, parses it with `parse_item`, and prints the line total:

```text
Item: Coffee beans, 2, 8.50
2 x Coffee beans = 17.00
```

Keep the guard: the tests import your file to call `parse_item` directly, and the guard stops your
`input()` call from running when they do. You can assume every line has exactly two commas.
