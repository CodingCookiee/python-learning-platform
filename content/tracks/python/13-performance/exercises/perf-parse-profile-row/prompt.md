Profile output is text, and a script that watches for slow functions has to read it. Write
`parse_row(line)`, which takes one row of `pstats` output and returns a tuple of
`(calls, tottime, cumtime, function)`: the call count as an `int`, the two times as `float`s, and
the function's description as a string.

```python
parse_row("     2000    0.125    0.000    0.125    0.000 main.py:13(is_known)")
# (2000, 0.125, 0.125, 'main.py:13(is_known)')
```

Recursive functions show two counts, `total/primitive`, like `7/3`; use the total. Built-ins are
described with spaces in them, like `{method 'split' of 'str' objects}`, and those must come back
whole.
