These shipping helpers have correct type hints, and mypy has found three bugs in them:

```text
solution.py:3: error: Incompatible return value type (got "str", expected "int")  [return-value]
solution.py:8: error: Returning Any from function declared to return "str"  [no-any-return]
solution.py:8: error: Unsupported operand types for + ("str" and "int")  [operator]
solution.py:11: error: Missing return statement  [return]
```

Fix the code, not the hints, so that `mypy --strict` passes and each function does what its
docstring says. Anything over 10 kg is `"large"`.

```python
parse_quantity(" 3 ")          # 3
line_label("MUG-01", 3)        # "MUG-01 x3"
shipping_band(25_000)          # "large"
```
