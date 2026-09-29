---
slug: files-and-encodings
title: Files, bytes and encodings
summary: Open files in the right mode, know when you have text and when you have bytes, and never let the encoding be a guess.
minutes: 40
exercises:
  - files-count-entries
  - files-predict-modes
  - files-fix-bom
  - files-read-legacy
  - files-merge-logs
---

A bank statement exported on one laptop opens on another as `RÃ©fÃ©rence` instead of `Référence`.
Nothing is corrupted: the file holds exactly the bytes it was written with. The second program just
turned those bytes back into text with a different rule. Files hold bytes; text is an
interpretation of them, and this lesson is about making that interpretation deliberate.

Every example here runs in a fresh temporary folder, made with `tempfile.mkdtemp()`.

## Opening, reading and writing

`open(path, mode, encoding=...)` returns a **file object**. Open it in a `with` statement, which
closes the file when the block ends, even if an exception is raised inside it. (Lesson 6 shows how
`with` works; for now, treat it as the only way to open a file.)

```python
import tempfile
from pathlib import Path

statement = Path(tempfile.mkdtemp()) / "statement.txt"

with open(statement, "w", encoding="utf-8") as file:
    file.write("2026-09-01 Opening balance 1200.00\n")
    file.write("2026-09-02 Card payment -45.60\n")

with open(statement, encoding="utf-8") as file:
    text = file.read()

text
```

`read()` returns the whole file as one string. For a file that might be large, loop over the file
object instead: it hands you one line at a time, so a 2 GB log never has to fit in memory. Each
line keeps its `"\n"`, so strip it off when you don't want it:

```python
import tempfile
from pathlib import Path

statement = Path(tempfile.mkdtemp()) / "statement.txt"
statement.write_text("2026-09-01 Opening balance 1200.00\n2026-09-02 Card payment -45.60\n", encoding="utf-8")

with open(statement, encoding="utf-8") as file:
    lines = [line.rstrip("\n") for line in file]

lines
```

`file.readline()` reads just the next line, which is handy for a header, and returns `""` at the
end of the file.

## Modes

The mode says what you intend to do with the file:

| Mode | Opens for | If the file exists | If it doesn't |
|------|-----------|--------------------|---------------|
| `"r"` (default) | reading | reads it | `FileNotFoundError` |
| `"w"` | writing | **empties it first** | creates it |
| `"a"` | appending | writes after the end | creates it |
| `"x"` | writing | `FileExistsError` | creates it |

Add `"b"` for bytes instead of text (`"rb"`, `"wb"`), and `"+"` to read and write the same file,
which you'll rarely need.

```python
import tempfile
from pathlib import Path

audit = Path(tempfile.mkdtemp()) / "audit.log"

with open(audit, "a", encoding="utf-8") as file:
    file.write("09:14 refund R-77 approved\n")
with open(audit, "a", encoding="utf-8") as file:
    file.write("09:20 refund R-78 approved\n")

try:
    with open(audit, "x", encoding="utf-8") as file:
        file.write("this would overwrite the log")
except FileExistsError:
    print("x refused to touch the existing log")

audit.read_text(encoding="utf-8")
```

> [!WARNING]
> `"w"` truncates the file the moment it's opened, before you've written anything. Opening your
> input file in `"w"` mode by mistake destroys it. Use `"x"` when you're creating a file that must
> not already exist, such as an invoice with a fresh number.

## Text is decoded bytes

A `str` is a sequence of characters. A `bytes` object is a sequence of numbers from 0 to 255. An
**encoding** is the rule that turns one into the other: `encode()` goes from text to bytes, and
`decode()` from bytes to text. UTF-8, the encoding of the web, uses one byte for ASCII characters
and two to four for everything else:

```python
label = "Café €4.50"
data = label.encode("utf-8")
data, len(label), len(data), data.decode("utf-8") == label
```

Text mode does that conversion for you on every read and write. Binary mode (`"rb"`, `"wb"`,
`read_bytes()`) skips it and gives you the raw bytes, which is what you want for images, PDFs,
zip files, or when you need to decide on the encoding yourself.

```python
import tempfile
from pathlib import Path

note = Path(tempfile.mkdtemp()) / "note.txt"
note.write_text("Référence", encoding="utf-8")
note.read_bytes(), note.read_text(encoding="utf-8")
```

> [!JS]
> Coming from JavaScript: it's the same split as Node's `fs.readFileSync(path)`, which gives a
> `Buffer`, versus `fs.readFileSync(path, "utf8")`, which gives a string. Python's `bytes` is the
> `Buffer`.

## Always pass encoding="utf-8"

Leave out `encoding` and Python uses the platform's default, which is UTF-8 on macOS and Linux but,
on many Windows machines, the old Windows code page `cp1252`. The same script then reads the same
file differently depending on where it runs. Decoding with the wrong rule gives either garbage or
an error:

```python
utf8_bytes = "Référence".encode("utf-8")
utf8_bytes.decode("cp1252")        # the RÃ©fÃ©rence from the introduction
```

```python raises
windows_bytes = "Référence".encode("cp1252")
windows_bytes.decode("utf-8")
```

`UnicodeDecodeError` is a subclass of `ValueError`, and its message gives the offending byte and
its position. When you genuinely don't know a file's encoding (an export from an old accounting
package, say), a common approach is to try UTF-8 first and fall back to the legacy encoding you
expect. Decoding with `errors="replace"` swaps undecodable bytes for `�` so you can at least read
the rest, but it loses data, so keep it for logs and previews.

```python
data = "Café".encode("cp1252")
data.decode("utf-8", errors="replace")
```

One more trap: Excel and some Windows tools start UTF-8 files with a **BOM** (byte order mark), the
three bytes `EF BB BF`. Read as plain UTF-8, it becomes an invisible `"﻿"` stuck to the first
word of the file, so a CSV's first column is called `"﻿Date"` instead of `"Date"`. The
`"utf-8-sig"` encoding strips a BOM if there is one, and reads normal UTF-8 the same as `"utf-8"`:

```python
data = "﻿Date,Amount\n".encode("utf-8")
data.decode("utf-8").split(","), data.decode("utf-8-sig").split(",")
```

```quiz
question: A CSV exported from Excel reads fine except that the first column name is "﻿Date". What's the fix?
options:
  - "Open it with encoding=\"utf-8-sig\""
  - "Open it with encoding=\"latin-1\""
  - "Open it in binary mode"
answer: 0
explain: "The file is UTF-8 with a byte order mark at the start. utf-8-sig decodes it as UTF-8 and drops the BOM. latin-1 would never fail, but it would decode the BOM as three odd characters instead."
```

## Line endings

Windows ends lines with `"\r\n"`, and everything else with `"\n"`. Text mode smooths this over in
both directions:

- **Reading**, any of `"\n"`, `"\r\n"` or `"\r"` arrives as `"\n"` (called universal newlines).
- **Writing**, each `"\n"` is written as the platform's line ending, so `"\r\n"` on Windows.

`newline=""` switches the translation off, and you'll need it for CSV files in the next lesson,
because the `csv` module handles line endings itself.

```python
import tempfile
from pathlib import Path

export = Path(tempfile.mkdtemp()) / "export.txt"
export.write_bytes(b"line one\r\nline two\r\n")   # written on Windows

with open(export, encoding="utf-8") as file:
    translated = file.read()
with open(export, encoding="utf-8", newline="") as file:
    untouched = file.read()

translated, untouched
```

## pathlib does the common cases in one call

Module 4 introduced `Path.read_text()` and `write_text()`. Each one opens the file, reads or writes
it, and closes it again, so it's the neatest choice for a small file you want all at once.
`read_bytes()` and `write_bytes()` are the binary versions, `path.open()` is `open(path)` for when
you need a file object, and they all take the same `encoding` and `newline` arguments.

Combined with `glob()` or `iterdir()`, that's most of what batch jobs need:

```python
import tempfile
from pathlib import Path

inbox = Path(tempfile.mkdtemp())
(inbox / "2026-09-01.txt").write_text("ORD-1\nORD-2\n", encoding="utf-8")
(inbox / "2026-09-02.txt").write_text("ORD-3\n", encoding="utf-8")
(inbox / "readme.md").write_text("Daily order exports\n", encoding="utf-8")

counts = {}
for export in sorted(inbox.glob("*.txt")):
    with export.open(encoding="utf-8") as file:
        counts[export.stem] = sum(1 for line in file if line.strip())
counts
```

`glob()` and `iterdir()` return paths in whatever order the file system keeps them, which differs
between machines, so sort them whenever order matters.

> [!JS]
> Coming from JavaScript: `path.read_text(encoding="utf-8")` is `fs.readFileSync(path, "utf8")`,
> and `folder.glob("*.txt")` replaces `fs.readdirSync` plus a filter. `Path` objects join with `/`
> instead of `path.join()`.

## Where this leaves you

Open files in a `with` block, in the mode that matches your intent, and always pass `encoding`:
`"utf-8"` by default, `"utf-8-sig"` for files from Excel, and a legacy encoding only when you know
the file uses one. Use binary mode when you need the raw bytes. Loop over a file object for large
files, and use `read_text()` for small ones. Remember that text mode translates line endings unless
you pass `newline=""`.
