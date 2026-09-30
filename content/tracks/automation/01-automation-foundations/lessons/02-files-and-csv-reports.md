---
slug: files-and-csv-reports
title: Files, folders and CSV reports
summary: Sort, rename, deduplicate and archive files with pathlib, without losing any, then turn messy CSV exports into reports people open in Excel.
minutes: 50
exercises:
  - auto-clean-filename
  - auto-sort-inbox
  - auto-fix-rename-overwrite
  - auto-find-duplicates
  - auto-fix-excel-export
  - auto-refund-report
lab:
  title: Tidy a messy folder
  kind: output
  instructions: >-
    Make the plan end with a line like "3 moves planned". After the --apply run, run the plan once
    more without --apply and paste its output here. A correct tidy script plans nothing the second
    time.
  command: uv run tidy.py ~/Downloads-copy
  patterns:
    - '^0 moves planned'
---

A bookkeeping firm gives each client a shared folder called `Inbox`. Clients drop in whatever
they have: `IMG_4411.JPG`, `Invoice #1042 (FINAL).PDF`, the same bank statement twice, and a
spreadsheet export from their shop. Every Monday a junior bookkeeper spends an hour sorting it
and another building a refunds summary for the partner. Neither job needs judgment, both happen
every week, and both are where files get lost. That's the brief for this lesson.

You met `pathlib` and the `csv` module in the Python track. Here the question is different: how
to use them on someone else's files, where a mistake deletes a client's receipts.

## A folder is a queue

To an automation, a folder is a list of work items. `iterdir()` gives you every entry, and the
checks you'll use constantly are `is_file()`, `suffix`, `name` and `stat()`. Browser examples run
on a real, in-memory file system, so you can build a practice inbox and look at it:

```python
import tempfile
from pathlib import Path

inbox = Path(tempfile.mkdtemp()) / "Inbox"
inbox.mkdir()
for name in ["Invoice #1042 (FINAL).PDF", "IMG_4411.JPG", "orders.csv", ".DS_Store"]:
    (inbox / name).write_text("demo")
(inbox / "invoices").mkdir()

[(p.name, p.suffix.lower(), p.is_file()) for p in sorted(inbox.iterdir())]
```

Notice what a real folder contains: a hidden `.DS_Store` from somebody's Mac, a subfolder from last
week's run, and extensions in capitals. Skip hidden files, skip directories, and compare suffixes
in lower case, every time.

## Plan first, then move

Never let a file-moving script loose in one step. Split it into a **plan** (a list of what would
move where, which you can print) and an **apply** step that executes the plan. The plan is the
dry run from the last lesson, and it's the list you show a client before the first real run.

```python
import shutil
import tempfile
from pathlib import Path

inbox = Path(tempfile.mkdtemp())
for name in ["march.pdf", "receipt.JPG", "notes.txt"]:
    (inbox / name).write_text("demo")

RULES = {".pdf": "invoices", ".jpg": "receipts", ".png": "receipts"}

def plan_moves(folder):
    return [
        (path, folder / RULES.get(path.suffix.lower(), "other") / path.name)
        for path in sorted(folder.iterdir())
        if path.is_file() and not path.name.startswith(".")
    ]

def apply(moves):
    for src, dst in moves:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(src, dst)

moves = plan_moves(inbox)
apply(moves)
sorted(p.relative_to(inbox).as_posix() for p in inbox.rglob("*") if p.is_file())
```

`shutil.move` rather than `Path.rename`: `rename` fails when the source and destination are on
different drives or network shares, and `shutil.move` falls back to copy-then-delete.

## Renaming without losing files

Clean names make folders searchable: `invoice-1042-final.pdf` beats `Invoice #1042 (FINAL).PDF`.
But the moment you clean names, two different files can end up with the same one. What happens
then depends on your operating system, which is the worst kind of bug:

```python
import tempfile
from pathlib import Path

folder = Path(tempfile.mkdtemp())
(folder / "Receipt.jpg").write_text("Tesco, 12 March")
(folder / "receipt.jpg").write_text("Shell, 14 March")

(folder / "Receipt.jpg").rename(folder / "receipt.jpg")
[(p.name, p.read_text()) for p in folder.iterdir()]
```

On Linux and macOS, `rename` **silently replaces** an existing file: the Shell receipt is gone,
with no error. On Windows the same line raises `FileExistsError`. (On macOS's default
case-insensitive disk, those two names are even the same file.) Either way, a renaming script must
check for the target itself, and pick a free name: `receipt.jpg`, then `receipt-2.jpg`, then
`receipt-3.jpg`.

> [!WARNING]
> `Path.replace()` is the same as `rename()` except it overwrites on every platform. That's what
> you want when writing a report over last week's copy, and never what you want for client files.

## Duplicates by content

Clients upload the same statement twice, under two names. Names can't tell you it's a duplicate;
the bytes can. Hash each file's content and group files with equal hashes. `hashlib.file_digest`
reads the file in chunks, so a 2 GB video doesn't need 2 GB of memory:

```python
import hashlib
import tempfile
from collections import defaultdict
from pathlib import Path

folder = Path(tempfile.mkdtemp())
(folder / "statement-march.pdf").write_bytes(b"%PDF bank statement 03")
(folder / "Scan 14.pdf").write_bytes(b"%PDF bank statement 03")
(folder / "statement-april.pdf").write_bytes(b"%PDF bank statement 04")

by_hash = defaultdict(list)
for path in sorted(folder.iterdir()):
    with path.open("rb") as fh:
        by_hash[hashlib.file_digest(fh, "sha256").hexdigest()].append(path.name)

[names for names in by_hash.values() if len(names) > 1]
```

A fast first pass: files of different sizes can't be equal, so group by `stat().st_size` and only
hash sizes that appear more than once. And report duplicates before deleting any: let the client
choose which copy to keep.

## Archiving old files

Folders grow for ever unless something archives them. A common rule: anything not modified for 90
days goes into a zip named after its month. `stat().st_mtime` is the modification time as a Unix
timestamp, and `zipfile` writes the archive:

```python
import os
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path

folder = Path(tempfile.mkdtemp())
old = folder / "jan-invoice.pdf"
old.write_text("demo")
january = datetime(2026, 1, 15, tzinfo=UTC).timestamp()
os.utime(old, (january, january))       # pretend it was last changed in January

modified = datetime.fromtimestamp(old.stat().st_mtime, tz=UTC)
archive = folder / f"archive-{modified:%Y-%m}.zip"
with zipfile.ZipFile(archive, "a", compression=zipfile.ZIP_DEFLATED) as zf:
    zf.write(old, arcname=old.name)
old.unlink()                             # only after the zip is written and closed

archive.name, zipfile.ZipFile(archive).namelist()
```

Delete the original only after the archive is safely closed, and pass `now` into the function
that decides what's "old", for the same reason as always.

## Reading CSV exports

Every business system exports CSV, and every export has quirks. Excel on Windows writes a **byte
order mark** (BOM), three invisible bytes at the start of the file. Read it as plain UTF-8 and the
BOM sticks to the first column's name:

```python
import csv
import io

exported = "﻿order_id,reason,amount\r\n1042,Damaged,12.50\r\n".encode("utf-8")

with io.TextIOWrapper(io.BytesIO(exported), encoding="utf-8", newline="") as fh:
    print(csv.DictReader(fh).fieldnames)
with io.TextIOWrapper(io.BytesIO(exported), encoding="utf-8-sig", newline="") as fh:
    print(csv.DictReader(fh).fieldnames)
```

`row["order_id"]` raises `KeyError` on the first version, and the column name looks right when you
print it. Open exports with `encoding="utf-8-sig"`: it strips a BOM if there is one and reads plain
UTF-8 if there isn't. Three more habits:

- Always pass `newline=""` to `open()` for CSV, so quoted fields that contain line breaks survive.
- Money is `Decimal`, never `float`: `Decimal(row["amount"])`. Summing a few hundred floats drifts
  by fractions of a penny, and accountants notice.
- Exports end with blank rows, have repeated header rows, and write the same reason as `Damaged`
  and `damaged `. Normalise before you group.

```python
from decimal import Decimal

sum([0.10, 0.20]), sum([Decimal("0.10"), Decimal("0.20")])
```

## Writing reports people open in Excel

`csv.DictWriter` writes rows from dicts in a fixed column order. Write to a `StringIO` when the
report is going into an email or an API, or to a file opened with `newline=""`:

```python
import csv
import io

rows = [
    {"reason": "damaged", "refunds": 14, "total": "412.50"},
    {"reason": "late delivery", "refunds": 9, "total": "180.00"},
]
buffer = io.StringIO()
writer = csv.DictWriter(buffer, fieldnames=["reason", "refunds", "total"], lineterminator="\n")
writer.writeheader()
writer.writerows(rows)
print(buffer.getvalue())
```

If the report contains names like `Zoë` or `£`, write it with `encoding="utf-8-sig"` so Excel on
Windows shows them correctly. And when the client wants a real spreadsheet, with bold headers,
column widths and several sheets, use **openpyxl** on your machine (`uv add openpyxl`; it isn't
available in the browser):

```python norun
from openpyxl import Workbook
from openpyxl.styles import Font

wb = Workbook()
ws = wb.active
ws.title = "Refunds"
ws.append(["Reason", "Refunds", "Total (£)"])
for cell in ws[1]:
    cell.font = Font(bold=True)
ws.append(["damaged", 14, 412.50])
ws.column_dimensions["A"].width = 20
wb.save("refunds-2026-w11.xlsx")
```

For anything bigger than a summary, with joins across exports and pivot tables, reach for pandas
(module 16): `pd.read_csv(path, encoding="utf-8-sig")` then `groupby`. For a weekly report of a few
thousand rows, `csv` and `Decimal` are enough and have no dependencies.

```quiz
question: "A client's export opens fine in Excel, but `row['order_id']` raises KeyError, and printing `reader.fieldnames` shows `['order_id', 'reason', 'amount']`. What's the likeliest cause?"
options:
  - The file uses semicolons instead of commas
  - The file starts with a BOM, which is glued to the first column name and invisible when printed
  - DictReader lowercases column names
answer: 1
explain: "The BOM (U+FEFF) is part of the first field name but doesn't show when printed. repr(reader.fieldnames[0]) reveals it, and encoding='utf-8-sig' fixes it."
```

## Do it on your machine

1. Make a copy of a real messy folder (your Downloads is perfect), so nothing you do can hurt the
   original.
2. Write `tidy.py` with a `plan_moves(folder)` like the one above and a `--apply` flag (argparse,
   module 10). Without the flag it only prints the plan.
3. Run `uv run tidy.py ~/Downloads-copy` and read the plan. Add rules until "other" is small.
4. Run it with `--apply`, then run it again: the second run should plan nothing.
5. Add duplicate detection as a report: print each group of identical files, and delete nothing.
6. **Check it:** end the plan with a line like `3 moves planned`, run the plan once more after
   `--apply`, and paste its output (`0 moves planned`) into the lab box below.

## Where this leaves you

Treat a folder as a queue, plan before you move, never let a rename overwrite, find duplicates by
content, and archive only after the zip is closed. Open exports with `utf-8-sig` and
`newline=""`, add money up in `Decimal`, and write reports with `DictWriter`. The drills build each
piece of the bookkeeping firm's Monday clean-up.
