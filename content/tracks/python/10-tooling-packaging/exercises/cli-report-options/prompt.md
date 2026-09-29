The invoicing tool's monthly report takes a month and three options:

```text
report MONTH [--format {table,csv,json}] [--limit LIMIT] [--min-total MIN_TOTAL]
```

Write two functions:

- `parse_month(text)` turns `"2026-09"` into the tuple `(2026, 9)`. For anything that isn't a year,
  a dash and a month from 1 to 12, it raises `argparse.ArgumentTypeError` with the message
  `2026-13 isn't a month; use YYYY-MM` (with the text it was given).
- `build_parser()` returns a parser with `prog="report"`:

| Argument | Type | Default | Help mentions |
|----------|------|---------|---------------|
| `month` | `parse_month` | required | `YYYY-MM` |
| `--format` | one of `table`, `csv`, `json` | `"table"` | `(default: table)` |
| `--limit` | `int` | `10` | `(default: 10)` |
| `--min-total` | `Decimal` | `Decimal("0")` | `(default: 0)` |

```python
args = build_parser().parse_args(["2026-09", "--format", "csv", "--min-total", "250.00"])
args.month, args.format, args.limit, args.min_total
# ((2026, 9), "csv", 10, Decimal("250.00"))
```

A bad month or format must end in argparse's usual error: a message on stderr and `SystemExit(2)`.
