---
slug: paths-json-enums
title: Paths, JSON and enums
summary: Treat file paths as objects, move data in and out of JSON without surprises, and replace magic strings with enums.
minutes: 40
exercises:
  - enum-parse-status
  - json-predict-roundtrip
  - json-customer-totals
  - paths-find-logs
  - paths-sort-by-extension
---

Three small modules turn up in almost every real program. `pathlib` handles file paths, so you never
glue folders together with `+ "/" +` again. `json` moves data between Python and the text format
every API speaks. `enum` gives a fixed set of values, such as order statuses, names that a typo
can't slip past.

## Paths are objects

A `Path` is an object, not a string, and the `/` operator joins its parts. It uses the right
separator for the operating system, and it knows the name, extension and folder of a file:

```python
from pathlib import Path

report = Path("reports") / "2026" / "sales-september.csv"
report.name, report.stem, report.suffix, report.parent, report.parts
```

`relative_to()` gives a path relative to a folder, and `as_posix()` writes it with forward slashes
whatever the operating system, which is what you want in a report or a URL:

```python
from pathlib import Path

base = Path("/srv/shop")
upload = base / "uploads" / "2026" / "invoice-1042.pdf"
upload.relative_to(base).as_posix(), upload.with_suffix(".txt").name
```

> [!TIP]
> Functions that take a folder should accept a string or a `Path`. Start with `folder = Path(folder)`,
> which works for both, and use `Path` methods from then on.

## Reading, writing and finding files

`Path` objects do the common file jobs themselves: `write_text` and `read_text` for a whole file at
once, `mkdir` for folders, `exists` and `is_file` for checks, `iterdir` for a folder's contents, and
`glob` for files matching a pattern. `rglob` does the same search through every subfolder too.

Code on this page runs in a temporary folder, created with `tempfile.mkdtemp()`:

```python
import tempfile
from pathlib import Path

root = Path(tempfile.mkdtemp())
(root / "logs").mkdir()
(root / "logs" / "app.log").write_text("started\nstopped\n", encoding="utf-8")
(root / "logs" / "worker.log").write_text("job 17 done\n", encoding="utf-8")
(root / "logs" / "notes.txt").write_text("rotate weekly\n", encoding="utf-8")

logs = sorted(p.name for p in (root / "logs").glob("*.log"))
first_lines = (root / "logs" / "app.log").read_text(encoding="utf-8").splitlines()
logs, first_lines
```

Always pass `encoding="utf-8"` when reading and writing text. Without it, Python uses the system's
default encoding, which differs between machines. Module 6 covers files, encodings and larger files
properly.

## Moving and deleting

`rename(target)` moves a file and returns its new path. `unlink()` deletes a file and `rmdir()` an
empty folder. Python 3.14 also added `copy(target)` and `move(target)` for whole files and folders.
`mkdir(parents=True, exist_ok=True)` creates a folder along with any missing parents, and doesn't
complain if it's already there:

```python
import tempfile
from pathlib import Path

inbox = Path(tempfile.mkdtemp())
invoice = inbox / "invoice-1042.pdf"
invoice.write_bytes(b"%PDF-1.7")

archive = inbox / "archive" / "2026"
archive.mkdir(parents=True, exist_ok=True)
moved = invoice.rename(archive / invoice.name)
invoice.exists(), moved.exists(), moved.relative_to(inbox).as_posix()
```

## JSON: text to data and back

`json.loads` turns JSON text into Python objects, and `json.dumps` turns them back into text. The
types map almost one to one: objects become dicts, arrays become lists, and `true`, `false` and
`null` become `True`, `False` and `None`.

```python
import json

payload = '{"id": "A1042", "paid": true, "coupon": null, "items": [{"sku": "mug", "qty": 2}]}'
order = json.loads(payload)
order["paid"], order["coupon"], order["items"][0]["qty"]
```

`dumps` takes options for how the text looks: `indent` for people, `sort_keys` for text that's
stable enough to compare or diff, and `ensure_ascii=False` to keep characters like `é` instead of
writing `é`:

```python
import json

order = {"id": "A1042", "total": 19.99, "note": "Café delivery"}
print(json.dumps(order))
print(json.dumps(order, indent=2, sort_keys=True, ensure_ascii=False))
```

Text that isn't valid JSON raises `json.JSONDecodeError`, a kind of `ValueError`. Single quotes are
a common culprit, because JSON only allows double quotes:

```python raises
import json

json.loads("{'id': 'A1042'}")
```

> [!JS]
> Coming from JavaScript: `json.loads` is `JSON.parse` and `json.dumps` is `JSON.stringify`. Both
> produce and accept the same text, but a parse error is a `ValueError` you can catch by name.

## Round trips that change your data

JSON has fewer types than Python, so some values come back different from how they went in. A tuple
becomes a list, and dict keys always become strings, because JSON object keys must be:

```python
import json

stock = {101: 12, 102: 0}
tags = ("gift", "express")
json.loads(json.dumps(stock)), json.loads(json.dumps(tags))
```

Some types have no JSON form at all, and `dumps` refuses them. A `datetime` is the one you'll meet
most:

```python raises
import json
from datetime import datetime, timezone

json.dumps({"placed": datetime(2026, 9, 25, 14, 3, tzinfo=timezone.utc)})
```

Convert those values yourself before dumping, usually to ISO 8601 text with `isoformat()`, and
convert them back with `fromisoformat()` after loading:

```python
import json
from datetime import datetime, timezone

placed = datetime(2026, 9, 25, 14, 3, tzinfo=timezone.utc)
text = json.dumps({"placed": placed.isoformat()})
text, datetime.fromisoformat(json.loads(text)["placed"]) == placed
```

## Named values with enum

Order statuses written as strings everywhere (`"paid"`, `"shipped"`) invite typos: `"shiped"` is a
perfectly good string, and nothing warns you. An **enum** defines the allowed values once. It's
written as a class; module 5 covers classes in full, but for an enum you only need this shape, one
`NAME = value` line per member:

```python
from enum import Enum


class OrderStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"


status = OrderStatus("paid")          # look a member up by its value
status, status.name, status.value, status is OrderStatus.PAID, [s.name for s in OrderStatus]
```

Looking up a value that isn't a member raises `ValueError`, so bad data is caught where it enters
the program instead of three functions later:

```python raises
from enum import Enum


class OrderStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"


OrderStatus("shiped")
```

A plain `Enum` member is not equal to its value, so `OrderStatus.PAID == "paid"` is `False`. When
the values really are strings that you'll compare with text, format into messages or write to JSON,
use `StrEnum`. Its members *are* strings, and `auto()` sets each value to the member's name in
lowercase:

```python
import json
from enum import StrEnum, auto


class Channel(StrEnum):
    WEB = auto()
    PHONE = auto()
    SHOP = auto()


Channel.WEB == "web", f"sold via {Channel.PHONE}", json.dumps({"channel": Channel.SHOP})
```

```quiz
question: "With class Level(Enum): HIGH = 'high', what is Level('high') == 'high'?"
options:
  - "True"
  - "False"
  - "It raises ValueError"
answer: 1
explain: "Level('high') is the member Level.HIGH. A plain Enum member never equals its raw value, so the comparison is False. A StrEnum member would compare equal."
```

## Where this leaves you

Build paths with `Path` and `/`, and let `Path` methods read, write, find and move files. Use
`json.loads` and `json.dumps` at the edges of your program, remembering that tuples, integer keys and
datetimes don't survive the round trip unchanged. Define fixed sets of values as enums, and use
`StrEnum` when they need to behave like strings. That's the last of the standard library tour: the
capstone puts `re`, `datetime`, `Counter` and friends to work on a real web-server log.
