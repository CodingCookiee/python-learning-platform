Write `calculate(expression, extra=None)` for a command-line calculator. `expression` is a number, a
space, an operator and another number. The result is always a float.

```python
calculate("12 * 3")       # 36.0
calculate("7.5 - 10")     # -2.5
calculate("9 / 4")        # 2.25
```

Support `+`, `-`, `*` and `/`, using a **dict that maps each operator to a function**, not an
`if`/`elif` chain. The optional `extra` dict adds operators of the same shape without changing
the built-in ones:

```python
calculate("2 ^ 10", extra={"^": pow})    # 1024.0
calculate("2 ^ 10")                     # ValueError: Unknown operator: ^
```

Raise `ValueError` with the message `Unknown operator: <op>` for an operator you don't know, and
with the message `Expected "number operator number"` when the expression doesn't have exactly three
parts.
