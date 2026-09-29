A payments API sends amounts as numbers, as strings, or as `null` (which arrives as `None`). Write
`to_amount(value)` that returns the amount as a `float`, or `None` when the value can't be turned
into one.

```python
to_amount("12.50")    # 12.5
to_amount(3)          # 3.0
to_amount("twelve")   # None
to_amount(None)       # None
```

Catch only the failures that mean "not an amount". Any other error should still reach the caller.
