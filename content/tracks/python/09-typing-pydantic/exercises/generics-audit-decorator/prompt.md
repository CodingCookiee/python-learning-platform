Finance wants every call to a money-moving function recorded. Write a decorator `audited` that
appends a line to `AUDIT_LOG` for each call, showing the function's name and its arguments (as
`repr`s, keyword arguments as `name=value`), and then calls the function and returns its result.

The decorator must be typed with a `ParamSpec`, so that a decorated function keeps its exact
signature: mypy should still reject `refund("A1042", "16.00")` after `@audited`. Keep the name and
docstring with `functools.wraps`, and make `mypy --strict` pass.

```python
refund("A1042", 1600)                     # True
refund("A1043", 500, reason="damaged")    # True
AUDIT_LOG
# ["refund('A1042', 1600)", "refund('A1043', 500, reason='damaged')"]
refund.__name__                           # "refund"
```
