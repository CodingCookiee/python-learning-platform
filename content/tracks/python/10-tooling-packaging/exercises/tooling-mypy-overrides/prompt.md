A project's `pyproject.toml` has a global `[tool.mypy]` table and several `[[tool.mypy.overrides]]`.
Write `mypy_option(text, module, option)` that returns the value mypy would use for one option when
checking one module:

- Each override has a `module` key: one pattern, or a list of patterns. A pattern is an exact module
  name (`invoicer.billing`), or ends in `.*` (`invoicer.*`), which matches that package and
  everything under it (`invoicer`, `invoicer.cli`, `invoicer.legacy.importer`).
- Among the overrides that match the module **and set the option**, the most specific pattern wins:
  an exact name beats any wildcard, and a wildcard with more parts beats one with fewer
  (`invoicer.legacy.*` beats `invoicer.*`), wherever they are in the file.
- If no override sets the option, use the global `[tool.mypy]` value, or `None` if that doesn't set
  it either.

```python
text = """
[tool.mypy]
strict = true
disallow_untyped_defs = true

[[tool.mypy.overrides]]
module = ["invoicer.legacy", "invoicer.legacy.*"]
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = "reportlab.*"
ignore_missing_imports = true
"""
mypy_option(text, "invoicer.legacy.importer", "disallow_untyped_defs")   # False
mypy_option(text, "invoicer.cli", "disallow_untyped_defs")               # True
mypy_option(text, "reportlab.lib.colors", "ignore_missing_imports")      # True
mypy_option(text, "httpx", "ignore_missing_imports")                     # None
```
