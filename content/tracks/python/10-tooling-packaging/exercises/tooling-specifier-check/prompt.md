Before upgrading a dependency, a release script checks the new version against the range in
`pyproject.toml`. Write `satisfies(version, specifier)`:

- `version` is a release number like `"0.28.1"`: whole numbers separated by dots.
- `specifier` is a comma-separated list of clauses, like `">=0.27,<1"`. Each clause is one of the
  operators `==`, `!=`, `>=`, `<=`, `>` or `<` followed by a version, with spaces allowed around
  both. The version must satisfy **every** clause; an empty specifier allows anything.
- Versions compare part by part as numbers, and missing parts count as zero, so `2.0` equals
  `2.0.0`.
- Raise `ValueError` for a clause with any other operator, such as `=>1.0` or `~=1.4`.

```python
satisfies("0.28.1", ">=0.27,<1")    # True
satisfies("1.10.0", ">=1.9")        # True (as strings, "1.10.0" < "1.9")
satisfies("3.0.0", ">=2.7, <3")     # False
```

Don't use the `packaging` library; the point is to see how it works.
