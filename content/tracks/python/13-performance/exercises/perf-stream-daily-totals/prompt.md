The daily sales job reads an export of `day,sku,amount` lines. The export arrives as a stream, one
line at a time, but `read_orders` turns all of it into a list of dicts first, and last Black Friday
the job ran out of memory.

```python
lines = ["2026-09-01,MUG-01,850", "2026-09-01,LAMP-02,2400", "2026-09-02,MUG-01,850"]
daily_totals(lines)
# {'2026-09-01': 3250, '2026-09-02': 850}
```

Refactor `read_orders` into a **generator** that yields one order dict at a time, so the whole job
runs in constant memory however long the export is. `daily_totals` must return exactly what it
does now. The tests stream 6 000 lines through it and check its peak memory stays small.
