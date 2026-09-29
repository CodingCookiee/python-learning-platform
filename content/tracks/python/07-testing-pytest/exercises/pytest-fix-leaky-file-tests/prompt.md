The shop's end-of-day report is written and read like this:

```python
# report.py
import csv
from decimal import Decimal


def write_daily_report(sales, path):
    """Write (item, quantity, unit_price) sales to a CSV report with a line total per row."""
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["item", "quantity", "unit_price", "line_total"])
        for item, quantity, unit_price in sales:
            writer.writerow([item, quantity, unit_price, f"{quantity * Decimal(unit_price):.2f}"])


def read_report_total(path):
    """The sum of the line_total column of a report written by write_daily_report."""
    with open(path, newline="", encoding="utf-8") as file:
        return sum((Decimal(row["line_total"]) for row in csv.DictReader(file)), Decimal("0"))
```

Its tests pass when you run them in file order, but they write `daily_report.csv` into the project
folder, and two of them only pass because an earlier test left that file behind.

Fix `test_report.py` so that each test uses its own file in `tmp_path` and passes on its own.
The grader runs your tests in **reverse order**, and fails any test that leaves a file in the
project folder. Keep the three behaviours the tests check.
