ruff reads its settings from `[tool.ruff]` in `pyproject.toml`, mypy from `[tool.mypy]`. The invoicer
is going to do the same: each project that uses it can set its own invoice settings in
`[tool.invoicer]`.

**In `main.py`:** `load_settings(path="pyproject.toml")` returns the settings: `DEFAULTS`, with any
values from the file's `[tool.invoicer]` table on top. It always returns a new dict.

- No file at `path`, or no `[tool.invoicer]` table: the defaults.
- A key that isn't one of the settings raises `ValueError` naming it, as in
  `unknown setting in [tool.invoicer]: due-days`, so a typo can't be silently ignored.
- `due_days` must be a whole number, 1 or more (`true` doesn't count), otherwise
  `ValueError("due_days must be a whole number of days, 1 or more")`.
- `currency` must be three capital letters, otherwise
  `ValueError("currency must be a three-letter code like GBP")`.

```python
load_settings("missing.toml")   # {"currency": "GBP", "due_days": 30, "footer": ""}
```

**In `pyproject.toml`:** this project bills its client in euros with 14 days to pay, and someone has
already tried to say so at the bottom of the file. As written, `load_settings` would never see it.
Fix the file so `load_settings()` returns `{"currency": "EUR", "due_days": 14, "footer": ""}`,
and leave the rest of it as it is.
