The invoicing service's log file needs lines like this one:

```text
2026-09-29 14:05:00 WARNING invoicer.billing: Card declined for INV-1042
```

Write `build_formatter()`, which returns a `logging.Formatter` that produces exactly that shape: the
time to the second (no milliseconds), the level, the logger's name, a colon, and the message with
any arguments filled in.

```python
formatter = build_formatter()
formatter.format(record)
# "2026-09-29 14:05:00 WARNING invoicer.billing: Card declined for INV-1042"
```
