---
slug: csv-and-json-files
title: CSV and JSON files
summary: Read and write CSV with the csv module instead of split(","), and move data through JSON files without losing types on the way.
minutes: 40
exercises:
  - csv-predict-dictreader
  - csv-totals-by-customer
  - csv-fix-hand-joined
  - files-json-settings
  - csv-orders-to-json
---

Spreadsheets speak CSV and APIs speak JSON, so most business data you touch will arrive as one or
the other. Both look simple enough to handle with `split()` and string formatting, and both have
edge cases that break exactly that. The standard library's `csv` and `json` modules handle them for
you.

## Why not split(",")

A CSV line is values separated by commas, until a value contains a comma. Then the value is wrapped
in double quotes, and a double quote inside a quoted value is written twice:

```python
line = 'A1002,"Hopper, Grace","Said ""leave at the door""",8.00'
line.split(",")
```

Four fields became five, and the quotes are still there. The `csv` module understands the quoting
rules. It reads from any file object, and `io.StringIO` makes a file object out of a string, which
is handy for examples and tests:

```python
import csv
import io

export = io.StringIO('A1002,"Hopper, Grace","Said ""leave at the door""",8.00\n')
next(csv.reader(export))
```

> [!JS]
> Coming from JavaScript: Node has no CSV parser built in, so you'd reach for a package. Python
> ships one, and it handles quoting, embedded newlines and other delimiters.

## Reading rows

Open the file with `newline=""` (the `csv` module handles line endings itself, including newlines
inside quoted values) and an explicit encoding, then wrap it in `csv.reader`. Each row is a
**list of strings**. The header is just the first row, so `next(reader)` takes it off:

```python
import csv
import tempfile
from pathlib import Path

orders = Path(tempfile.mkdtemp()) / "orders.csv"
orders.write_text("order_id,customer,total\nA1001,Ada,12.50\nA1002,\"Hopper, Grace\",8.00\n", encoding="utf-8")

with open(orders, newline="", encoding="utf-8") as file:
    reader = csv.reader(file)
    header = next(reader)
    rows = list(reader)

header, rows
```

Every value is a string, including the totals. CSV has no types, so converting `"12.50"` to a
`Decimal` or `"3"` to an `int` is always your job.

## DictReader: rows by column name

`csv.DictReader` reads the header for you and gives each row as a dict keyed by column name. Code
that says `row["total"]` keeps working when someone adds a column or moves one:

```python
import csv
import io
from decimal import Decimal

export = io.StringIO(
    "order_id,customer,total\n"
    "A1001,Ada,12.50\n"
    "A1002,Grace,8.00\n"
    "A1003,Ada,4.25\n"
)
totals = {}
for row in csv.DictReader(export):
    totals[row["customer"]] = totals.get(row["customer"], Decimal("0")) + Decimal(row["total"])
totals
```

Messy files show two more behaviours. A row with **too few** values gets `None` for the missing
columns, and a row with **too many** puts the extras in a list under the key `None`:

```python
import csv
import io

export = io.StringIO("order_id,customer,total\nA1004,Linus\nA1005,Margaret,9.99,gift wrap\n")
list(csv.DictReader(export))
```

Those `None`s are how you spot a broken row, and the capstone relies on them.

## Writing rows

`csv.writer` has `writerow(list)` and `writerows(rows)`; `csv.DictWriter` takes the column names up
front and writes dicts. Both quote values that need it, so you never build a line by hand:

```python
import csv
import tempfile
from pathlib import Path

report = Path(tempfile.mkdtemp()) / "customers.csv"
customers = [
    {"name": "Hopper, Grace", "city": "New York", "orders": 3},
    {"name": "Ada Lovelace", "city": "London", "orders": 5},
]

with open(report, "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=["name", "city", "orders"])
    writer.writeheader()
    writer.writerows(customers)

report.read_bytes()
```

Numbers are written with `str()`, and each row ends with `\r\n`, the line ending the CSV standard
specifies. That's why `newline=""` matters when writing too: without it, text mode on Windows
turns each `\n` into `\r\n` again, and every row is followed by an empty one when the file opens in
Excel.

A dict with keys that aren't in `fieldnames` makes `DictWriter` raise `ValueError`. Pass
`extrasaction="ignore"` when you deliberately write only some of the fields.

> [!TIP]
> Many European spreadsheets use `;` between values, because `,` is their decimal separator. Pass
> `delimiter=";"` to `reader`, `writer`, `DictReader` or `DictWriter` to handle them.

```quiz
question: "csv.DictReader reads the line `A1001,Ada,3`. What is row[\"quantity\"] for the third column, called quantity?"
options:
  - "3"
  - "\"3\""
  - "None"
answer: 1
explain: CSV has no types, so every value is a string. Convert it yourself with int(row["quantity"]). None only appears for columns that are missing from the row altogether.
```

## JSON files

Module 4 used `json.loads` and `json.dumps` with strings. For files, `json.load(file)` and
`json.dump(data, file)` read and write a file object directly. Write with an explicit encoding and
`ensure_ascii=False` to keep characters like `é` readable, and `indent=2` if people will read the
file:

```python
import json
import tempfile
from pathlib import Path

settings_file = Path(tempfile.mkdtemp()) / "settings.json"
settings = {"shop": "Café Lumière", "currency": "EUR", "tax_rates": [0.2, 0.055]}

with open(settings_file, "w", encoding="utf-8") as file:
    json.dump(settings, file, indent=2, ensure_ascii=False)

with open(settings_file, encoding="utf-8") as file:
    loaded = json.load(file)

print(settings_file.read_text(encoding="utf-8"))
loaded == settings
```

A file that isn't valid JSON raises `json.JSONDecodeError`, a `ValueError` whose `lineno` and
`colno` attributes say where parsing stopped. Hand-edited config files are the usual culprit,
often with a trailing comma:

```python
import json

text = '{\n  "shop": "Café Lumière",\n  "currency": "EUR",\n}'
try:
    json.loads(text)
except json.JSONDecodeError as error:
    problem = (error.msg, error.lineno, error.colno)
problem
```

## Types JSON doesn't have

JSON has strings, numbers, booleans, null, arrays and objects. A `Decimal`, a `date` or a `set`
makes `json.dump` raise `TypeError`. The `default=` argument is a function that `json` calls for any
value it can't handle; whatever it returns is written instead:

```python
import json
from datetime import date
from decimal import Decimal

def to_json(value):
    if isinstance(value, (Decimal, date)):
        return str(value)
    raise TypeError(f"can't write {type(value).__name__} as JSON")


invoice = {"number": "INV-1042", "total": Decimal("99.90"), "due": date(2026, 10, 15)}
text = json.dumps(invoice, default=to_json)
text, json.loads(text)
```

The round trip is one-way for those types: they come back as strings, and turning them back into
`Decimal` and `date` is up to the code that loads them. Raising `TypeError` for anything else
keeps a stray object from being written as nonsense.

> [!WARNING]
> `default=str` is a popular shortcut, and it will happily write any object at all, including one
> whose `str()` is `<Order object at 0x10f3>`. Handle the types you expect and raise for the rest.

## Where this leaves you

Read CSV with `csv.reader` or `csv.DictReader`, and write it with `csv.writer` or `csv.DictWriter`,
always opening the file with `newline=""` and an encoding. Every CSV value is a string, and short
or long rows show up as `None` values or a `None` key. Read and write JSON files with `json.load`
and `json.dump`, catch `JSONDecodeError` for files people edit by hand, and convert `Decimal`,
`date` and friends yourself in both directions.
