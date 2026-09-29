The reporting code calls these helpers with tuples from the database driver, generators, sets and
lists of whole-number totals. Every call works, and mypy rejects nearly all of them, because
`list[float]` promises far more than the functions need:

```python
average_order_value((19.99, 5.0))          # a tuple isn't a list
whole: list[int] = [1999, 2500]
average_order_value(whole)                 # list[int] isn't list[float]: lists are invariant
total_revenue(t for t in [12.5, 7.5])      # a generator isn't a list
revenue_by_region({"EU": (10.0, 5.5)})     # nor is the tuple inside
```

Change only the parameter hints so that each function asks for the least it needs: `Iterable`
where one pass is enough, `Sequence` where it also needs `len()`, and `Mapping` for a dict it only
reads. Keep the return types as they are. `mypy --strict` must pass, the calls above must
type-check, and mypy must still reject a list of strings, and a generator passed to
`average_order_value` (a generator has no length).
