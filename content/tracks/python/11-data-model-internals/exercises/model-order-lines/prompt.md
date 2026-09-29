Write a class `OrderLines(lines)` for the lines of an order, where each line is a
`(sku, quantity)` tuple. It should work with the syntax a list does:

- `len(lines)` is the number of lines, and an order with no lines is falsy.
- `lines[0]` and `lines[-1]` return a line tuple; a slice like `lines[1:3]` returns a new
  `OrderLines`. An index past the end raises `IndexError`.
- `"MUG-01" in lines` is true when any line has that **SKU**.
- Iterating gives the line tuples in order.
- Two `OrderLines` are equal when they have the same lines in the same order, and `repr()` shows
  them: `OrderLines([('MUG-01', 2), ('TEA-50', 1)])`.

```python
lines = OrderLines([("MUG-01", 2), ("TEA-50", 1), ("LAMP-02", 1)])
len(lines)           # 3
lines[-1]            # ('LAMP-02', 1)
lines[:2]            # OrderLines([('MUG-01', 2), ('TEA-50', 1)])
"TEA-50" in lines    # True
bool(OrderLines([])) # False
```
