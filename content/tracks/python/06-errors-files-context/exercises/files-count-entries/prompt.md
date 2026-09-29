A bank statement is a UTF-8 text file with one transaction per line, and the bank pads it with
blank lines. Write `count_entries(path)` that returns how many lines have something on them.

For a file containing:

```text
2026-09-01 Opening balance 1200.00

2026-09-02 Card payment, Café Lumière -12.40

2026-09-03 Salary 2450.00
```

```python
count_entries(path)   # 3
```

A line of only spaces counts as blank. `path` may be a `Path` or a string. Read the file line by
line rather than all at once, since some statements run to millions of lines.
