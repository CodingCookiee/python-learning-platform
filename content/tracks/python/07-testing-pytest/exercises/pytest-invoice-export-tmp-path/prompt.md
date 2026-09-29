Accounts exports the month's invoices for the bookkeeper:

```python
# export.py
import csv
from pathlib import Path


def export_invoices(invoices, path, overwrite=False):
    """Write invoices to a CSV file and return how many were written.

    invoices is a list of dicts with "number", "customer" and "total" (a Decimal).
    The file has a header row, number,customer,total, and totals are written with
    two decimal places. An existing file is never replaced unless overwrite=True:
    FileExistsError is raised instead.
    """
    path = Path(path)
    if path.exists() and not overwrite:
        raise FileExistsError(f"{path} already exists")
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["number", "customer", "total"])
        for invoice in invoices:
            writer.writerow([invoice["number"], invoice["customer"], f"{invoice['total']:.2f}"])
    return len(invoices)
```

```python
export_invoices([{"number": "INV-1042", "customer": "Millstone Coffee", "total": Decimal("12.5")}], path)
```

```text
number,customer,total
INV-1042,Millstone Coffee,12.50
```

Write `test_export.py`. Every file a test writes must go in the test's `tmp_path` folder: the
grader fails any test that leaves a file in the project folder. Read the files back with plain
Python (`read_text()` or `csv`) to check them. Your tests must pass on this code and catch the
bugs planted in copies of it.
