A small command-line tool summarises a day's sales file:

```python
# sales_cli.py
import csv
import sys
from decimal import Decimal
from pathlib import Path


def main(argv):
    """Summarise a sales CSV:  python sales_cli.py sales.csv

    The file has a header row and item,quantity,unit_price columns. Prints
    "3 sales, 7 items, total 42.50" and returns 0. With the wrong number of
    arguments it prints a usage line to stderr and returns 2. If the file doesn't
    exist it prints "error: no such file: NAME" to stderr and returns 1.
    """
    if len(argv) != 1:
        print("usage: sales_cli.py SALES_CSV", file=sys.stderr)
        return 2
    path = Path(argv[0])
    if not path.exists():
        print(f"error: no such file: {path.name}", file=sys.stderr)
        return 1
    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    items = sum(int(row["quantity"]) for row in rows)
    total = sum((int(row["quantity"]) * Decimal(row["unit_price"]) for row in rows), Decimal("0"))
    print(f"{len(rows)} sales, {items} items, total {total:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
```

```text
$ python sales_cli.py monday.csv
3 sales, 7 items, total 42.50
$ python sales_cli.py tuesday.csv
error: no such file: tuesday.csv
```

Write `test_sales_cli.py` to test the tool end to end: write sales files into `tmp_path`, call
`main([...])`, and check the exit code and, with `capsys`, what went to standard output and what
went to standard error. Your tests must pass on this code and catch the bugs planted in copies of
it.
