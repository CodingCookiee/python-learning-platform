Write a generic `last(items)` that returns the last item of any sequence (a list, a tuple or a
string) and raises `IndexError("no items")` when it's empty.

Its hints must connect the input to the output: `last` of a `list[int]` is an `int`, and `last` of a
`tuple[str, ...]` is a `str`, so mypy catches a caller who treats the result as the wrong type. Use
the Python 3.12 syntax for the type parameter, and make `mypy --strict` pass.

```python
last([1600, 900, 2450])           # 2450
last(("MUG-01", "BEANS-1KG"))     # "BEANS-1KG"
last([])                          # IndexError: no items
```
