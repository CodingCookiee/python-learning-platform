---
slug: regular-expressions
title: Text patterns with re
summary: Raw strings, the pattern language, groups and named groups, findall, sub, compiled patterns and flags.
minutes: 45
exercises:
  - regex-find-order-ids
  - regex-predict-findall
  - regex-fix-raw-strings
  - regex-parse-log-line
  - regex-mask-emails
  - regex-logfmt-pairs
---

String methods take you a long way: `in`, `startswith`, `split` and `replace` handle fixed text. They
run out when the text you're looking for has a *shape* rather than a fixed value: "any time like
14:03", "an order number", "whatever sits between the quotes". That's the job of a **regular
expression**, a small pattern language, and Python's `re` module runs it.

```python
import re

note = "Delivery window 09:00-12:00, driver arrived 12:41"
re.findall(r"\d\d:\d\d", note)
```

`\d` means "any digit", so `\d\d:\d\d` means "two digits, a colon, two digits". `findall` returns
every piece of the text that fits.

## Always use raw strings

Regex patterns are full of backslashes, and so are Python's own string escapes. In a normal string,
`"\b"` is a single backspace character, not the two characters the regex engine needs for "word
boundary". A **raw string**, written with an `r` prefix, keeps every backslash as it is:

```python
len("\b"), len(r"\b"), "\b" == r"\b"
```

A pattern like `"\bORD\b"` in a normal string silently searches for backspace characters and never
matches anything. Python warns about some broken escapes such as `"\d"`, but not `"\b"`, which is a
valid string escape. Write every pattern as `r"..."` and the problem can't happen.

## The pattern language

Most patterns are built from a handful of pieces:

| Pattern | Matches |
|---------|---------|
| `.` | any character except a newline |
| `\d`, `\w`, `\s` | a digit; a letter, digit or underscore; whitespace |
| `\D`, `\W`, `\S` | anything *except* those |
| `[abc]`, `[a-z]`, `[^"]` | one character from a set; a range; anything *not* in the set |
| `*`, `+`, `?` | the thing before it zero or more times; one or more; zero or one |
| `{4}`, `{2,5}`, `{4,}` | exactly 4 times; 2 to 5 times; 4 or more |
| `^`, `$` | the start and the end of the text |
| `\b` | a word boundary: the edge between a word character and anything else |
| `a\|b` | `a` or `b` |
| `\.`, `\$`, `\(` | a literal `.`, `$` or `(` (escape the special characters) |

Repeats are **greedy**: they take as much as they can. Adding `?` after a repeat makes it take as
little as it can, which matters whenever something could match too far:

```python
import re

html = "<b>Sale</b> ends <i>Friday</i>"
re.findall(r"<.+>", html), re.findall(r"<.+?>", html)
```

## search, match and fullmatch

Three functions look for one match. `search` looks anywhere in the text, `match` only at the start,
and `fullmatch` requires the whole text to fit, which makes it the one for validation. Each returns a
`Match` object, or `None` when nothing fits:

```python
import re

sku = r"[A-Z]{3}-\d{4}"
(
    re.search(sku, "2 x MUG-0042 in stock"),
    re.match(sku, "2 x MUG-0042 in stock"),
    re.fullmatch(sku, "MUG-0042"),
    re.fullmatch(sku, "MUG-0042 "),
)
```

Because a failed match is `None`, check for it before you use the result. Calling `.group()` on
`None` is the classic regex crash:

```python
import re

m = re.search(r"ORD-\d+", "Where is my parcel?")
if m is None:
    print("no order number in this message")
else:
    print("order", m.group())
```

## Groups and named groups

Parentheses make a **group**: a part of the match you can pull out on its own. `group(0)` is the
whole match, and `group(1)`, `group(2)`… are the groups, counted by their opening parenthesis:

```python
import re

m = re.search(r"(\w+)@([\w.]+)", "Contact: ada@example.com")
m.group(0), m.group(1), m.group(2), m.groups()
```

Numbered groups get hard to follow in a long pattern. `(?P<name>...)` gives a group a name, and
`m["name"]` or `m.groupdict()` reads it back:

```python
import re

m = re.match(
    r"(?P<date>\S+) (?P<time>\S+) (?P<level>[A-Z]+) (?P<message>.*)",
    "2026-09-25 14:03:07 WARN card declined for order A1042",
)
m["level"], m.groupdict()
```

`(?:...)` groups without capturing, for when you need parentheses only to apply `?` or `|` to
several characters at once.

> [!JS]
> Coming from JavaScript: named groups are written `(?P<name>...)`, with a `P`. Python rejects the
> JavaScript form `(?<name>...)`.

## findall and finditer

`findall` returns every match as strings. There is one twist: if the pattern has groups, it returns
the **groups** instead of the whole match, as a tuple when there is more than one:

```python
import re

refunds = "Refunds: A1042 12.50, A1107 3.00"
re.findall(r"A\d{4} \d+\.\d\d", refunds), re.findall(r"(A\d{4}) (\d+\.\d\d)", refunds)
```

When you need more than the text, such as a named group or where the match is, `finditer` yields
the `Match` objects themselves:

```python
import re

refunds = "Refunds: A1042 12.50, A1107 3.00"
for m in re.finditer(r"(?P<order>A\d{4}) (?P<amount>\d+\.\d\d)", refunds):
    print(m["order"], float(m["amount"]), "at position", m.start())
```

```quiz
question: "What does re.findall(r'(\\d+)-(\\d+)', 'rooms 10-20 and 30-40') return?"
options:
  - "['10-20', '30-40']"
  - "[('10', '20'), ('30', '40')]"
  - "['10', '20', '30', '40']"
answer: 1
explain: With two groups in the pattern, findall returns one tuple of groups per match instead of the whole matched text.
```

## Replacing with sub

`re.sub(pattern, replacement, text)` replaces every match. In the replacement, `\1` (or
`\g<name>`) inserts a group, so you can rearrange what you matched:

```python
import re

re.sub(r"(\d{4})-(\d{2})-(\d{2})", r"\3/\2/\1", "Shipped 2026-09-25, delivered 2026-09-28")
```

When the replacement needs real logic, pass a function instead. It's called with each `Match` and
returns the text to put in its place:

```python
import re


def to_pounds(m):
    return f"£{int(m['pence']) / 100:.2f}"


re.sub(r"(?P<pence>\d+)p\b", to_pounds, "Postage 250p, packing 99p")
```

`count=1` replaces only the first match.

## Compiling and flags

`re.compile(pattern)` turns a pattern into an object with the same methods (`search`, `findall`,
`sub`…). Python caches patterns anyway, so the gain is mostly readability: a pattern with a name,
defined once at the top of the module, is easier to test and reuse.

Flags change how a pattern matches. `re.IGNORECASE` ignores case, `re.MULTILINE` makes `^` and `$`
match at every line, and `re.VERBOSE` lets you spread a pattern over several lines with comments,
ignoring the whitespace in it:

```python
import re

PRICE = re.compile(
    r"""
    £              # currency sign
    (\d+)          # pounds
    (?:\.(\d\d))?  # optional pence
    """,
    re.VERBOSE,
)
log = "ERROR disk full\nwarn slow response\nError timeout"

PRICE.findall("Mug £8.50, tea £4, cake £12.25"), re.findall(r"^error", log, re.IGNORECASE | re.MULTILINE)
```

> [!JS]
> Coming from JavaScript: flags aren't letters after a slash (`/error/gi`), they're arguments. There
> is no `g` flag either, because `findall`, `finditer` and `sub` already work on every match.

> [!WARNING]
> Regexes are for text with a simple shape. Don't parse JSON, HTML or CSV with them: `json`,
> `html.parser` and `csv` handle the nesting and quoting rules that a regex gets wrong.

## Where this leaves you

Write patterns as raw strings. Use `search`, `match` or `fullmatch` for one match, `findall` or
`finditer` for all of them, and `sub` to rewrite text, with a function when the replacement needs
logic. Name your groups once a pattern has more than one, and compile patterns you reuse. The drills
work up from finding order ids to parsing a full web-server log line.
