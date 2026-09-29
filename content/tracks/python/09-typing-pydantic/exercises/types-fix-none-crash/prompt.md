The loyalty page works for every customer in the test data, and crashes for anyone who isn't a
customer yet. mypy saw it coming:

```text
solution.py:25: error: Item "None" of "Customer | None" has no attribute "name"  [union-attr]
solution.py:31: error: Item "None" of "Customer | None" has no attribute "loyalty_points"  [union-attr]
solution.py:44: error: Item "None" of "str | None" has no attribute "upper"  [union-attr]
```

Handle the `None` case in each place so that each function does what its docstring says and
`mypy --strict` passes. Don't change any signatures.

```python
greeting("ada@example.com")       # "Hello Ada"
greeting("new@example.com")       # "Hello there"
points_balance("new@example.com") # 0
banner("grace@example.com")       # "WELCOME"  (Grace has no points)
banner("ada@example.com")         # "YOU HAVE 120 POINTS"
```
