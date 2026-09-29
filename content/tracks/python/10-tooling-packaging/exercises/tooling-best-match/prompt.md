A resolver's simplest job: given every release of a package on the index and the range your
project allows, pick the newest release that fits. Write `best_match(available, specifier)`.

The specifier supports everything from the previous drill (`==`, `!=`, `>=`, `<=`, `>`, `<`, joined
by commas), plus:

- **Wildcards** on `==` and `!=`: `==5.2.*` matches any version whose first parts are `5.2`
  (`5.2`, `5.2.0`, `5.2.7`, but not `5.20.1`), and `!=5.2.*` matches everything else.
- **Compatible release** `~=`: `~=2.2.1` means `>=2.2.1, ==2.2.*`, and `~=2.2` means
  `>=2.2, ==2.*`. A `~=` version needs at least two parts, so raise `ValueError` for `~=2`.

Return the matching version exactly as it appears in `available`, or `None` if none match. Raise
`ValueError` for an operator you don't recognise.

```python
releases = ["2.6.4", "2.7.0", "2.10.1", "2.11.3", "3.0.0"]
best_match(releases, ">=2.7,<3")     # "2.11.3"
best_match(releases, "~=2.7.0")      # "2.7.0"
best_match(releases, "==2.1.*")      # None
```
