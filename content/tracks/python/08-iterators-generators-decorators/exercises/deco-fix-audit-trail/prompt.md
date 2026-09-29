Compliance asked for every billing action to be recorded. Someone wrote an `@audited` decorator
that adds `(function_name, args, kwargs)` to `AUDIT_TRAIL` before each call, and put it on
`refund` and `void`. Since then, billing is broken:

```python
refund("A1", 12.5, reason="damaged")   # TypeError
void("A2")                             # None
```

Fix `audited` so that decorated functions behave exactly as they did before, including their
names and docstrings, while every call is still recorded. When you're done:

```python
refund("A1", 12.5, reason="damaged")   # "refunded 12.50 on A1"
AUDIT_TRAIL                            # [("refund", ("A1", 12.5), {"reason": "damaged"})]
refund.__name__                        # "refund"
```
