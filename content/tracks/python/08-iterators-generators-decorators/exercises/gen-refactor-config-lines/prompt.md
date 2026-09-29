`config_lines(lines)` yields the meaningful lines of a config file: each one stripped of
surrounding whitespace, skipping blank lines and comments that start with `#`. It works, but it's
built on a hand-written iterator class that's three times longer than it needs to be.

Rewrite `config_lines` as a **generator function** and remove the `ConfigLines` class. It must
behave exactly as it does now, including reading its input lazily, one line at a time.

```python
settings = ["# shop settings", "", "  currency = GBP  ", "# tax", "vat = 20"]
list(config_lines(settings))
# ["currency = GBP", "vat = 20"]
```
