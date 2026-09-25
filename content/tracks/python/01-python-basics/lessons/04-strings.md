---
slug: strings
title: Strings
summary: Slice, clean, search and split text, then format it precisely with f-strings.
minutes: 40
exercises:
  - strings-predict-slices
  - strings-normalise-email
  - strings-mask-card
  - strings-receipt-row
  - strings-slugify
---

Most data reaches your program as text: a name typed into a form, a line from a log file, a price
in a CSV export. Before you can use it you have to cut it up, clean it and check it, and before you
can show a result you have to format it. That's this lesson. Everything here works on `str`, Python's
text type.

## Writing strings

Single and double quotes make exactly the same kind of string. Pick one style and switch only when
the text contains that quote. Triple quotes let a string run over several lines.

```python
product = 'Coffee beans'
review = "It's the best roast I've had"
note = """Deliver to the side door.
Ring twice."""
print(review)
print(note)
```

Inside a string, a backslash starts an **escape sequence**: `\n` is a newline, `\t` is a tab, `\"`
is a quote and `\\` is one real backslash. That's a trap with Windows paths, where `\t` and `\n`
turn into a tab and a newline:

```python
print("C:\temp\new_orders")
print(r"C:\temp\new_orders")
```

The `r` prefix makes a **raw string**, in which backslashes are just backslashes. Use raw strings for
Windows paths and, later, for regular expressions. `len()` counts characters; an escape sequence is
one character:

```python
len("tab\there"), len(r"tab\there")
```

Two operators work on strings: `+` joins two strings into a new one, and `*` repeats a string, which
is handy for drawing a rule under a heading.

```python
title = "Order summary"
print(title)
print("-" * len(title))
"Order " + "#" + "1042"
```

## Indexing and slicing

A string is a sequence of characters, numbered from `0`. Negative indices count from the end, so
`-1` is the last character. Square brackets pick one character out:

```python
code = "ORD-2026-0917"
code[0], code[4], code[-1]
```

A **slice** `[start:stop]` takes a range. It includes `start` and stops just **before** `stop`, so
`code[4:8]` is characters 4, 5, 6 and 7. Leave out `start` to begin at the start, or `stop` to run to
the end. A third number is a step.

```python
code = "ORD-2026-0917"
code[:3], code[4:8], code[-4:], code[::2], code[::-1]
```

`[::-1]` steps backwards through the whole string, which reverses it. Asking for a single index that
doesn't exist is an error, but a slice that runs off the end just stops early:

```python raises
code = "ORD-2026-0917"
print(repr(code[20:]))   # a slice past the end is empty: ''
code[20]                 # an index past the end is an error
```

```quiz
question: "With `code = \"ORD-2026-0917\"`, what is `code[-4:-1]`?"
options:
  - "\"0917\""
  - "\"091\""
  - "\"917\""
answer: 1
explain: "-4 is the 0, and the slice stops just before -1 (the final 7), so you get \"091\". Leave the stop out, code[-4:], to include the last character."
```

## Strings are immutable

You can't change a string in place. Every method that looks like it changes one, such as `upper()`
or `replace()`, returns a **new** string and leaves the original alone (lesson 2 showed why sharing
immutable objects is always safe). The classic mistake is calling a method and throwing the result
away:

```python
customer = "  ada lovelace  "
customer.strip()      # builds a new, stripped string... and discards it
customer              # unchanged
```

Assign the result to keep it: `customer = customer.strip()`.

## Cleaning text

Text from people and files arrives with stray spaces and inconsistent capitals. These methods, each
returning a new string, fix most of it:

```python
raw = "  ada LOVELACE \n"
cleaned = raw.strip()
cleaned, cleaned.lower(), cleaned.upper(), cleaned.title()
```

- `strip()` removes whitespace (spaces, tabs, newlines) from both ends, never from the middle.
  `lstrip()` and `rstrip()` do one end only.
- `lower()`, `upper()` and `title()` change case. Compare text case-insensitively by lowering both
  sides first.
- `replace(old, new)` swaps every occurrence of `old`.

Because each method returns a string, you can chain them, reading left to right:

```python
sku = " cb-500g-dark "
sku.strip().upper().replace("-", "_")
```

> [!WARNING]
> `title()` capitalises the letter after anything that isn't a letter, so `"it's".title()` is
> `"It'S"`, and it can't know that "McDonald" has two capitals. Use it for quick display, not for
> storing people's names.

## Searching text

`in` asks whether one string appears inside another. It's the most readable check, and it's
case-sensitive. `startswith` and `endswith` check the ends; both accept a tuple of options. `find`
returns the index where a match starts, or `-1` when there isn't one, and `count` counts matches.

```python
line = "2026-09-25 14:03:11 ERROR Payment declined for order 1042"

"ERROR" in line, line.startswith("2026-09"), line.endswith(("1042", "1043"))
```

```python
line = "2026-09-25 14:03:11 ERROR Payment declined for order 1042"

line.find("ERROR"), line.find("WARNING"), line.count("0")
```

> [!TIP]
> Reach for `in` when you only need yes or no. Use `find` when you need the position, and check for
> `-1` before you slice with it: when there's no match, `line[line.find("WARNING"):]` quietly gives
> you the last character instead of an error.

## Splitting and joining

`split(separator)` cuts a string into pieces and returns them as a **list**, an ordered collection
written in square brackets. The next module covers lists properly; for now you only need to index
one or unpack it into names.

```python
row = "Coffee beans, 2, 8.50"
row.split(",")
```

The pieces keep their spaces, so strip each one. Unpacking assigns the pieces to names in one go,
exactly like the swap in lesson 2:

```python
name, quantity, price = "Coffee beans, 2, 8.50".split(",")
name.strip(), int(quantity), float(price)
```

With no argument, `split()` splits on any run of whitespace and ignores whitespace at the ends,
which is the right tool for messy text. `join` goes the other way: the string you call it on is
the glue placed between the pieces.

```python
words = "  Summer   sale\t2026 ".split()
words, "-".join(words), " / ".join(["ORD", "2026", "0917"])
```

`join` only accepts strings. Numbers have to be converted first:

```python raises
" / ".join(["ORD", 1042])
```

## f-strings

An **f-string** has an `f` before the quote, and any expression inside `{}` is evaluated and
inserted as text. It's the standard way to build strings in modern Python.

```python
customer = "Ada"
items = 3
total = 25.5
f"{customer} ordered {items} items for {total * 1.2}"
```

Adding with `+` works too, but only between strings, so every number needs `str()` first. f-strings
convert for you. The total came out as `30.599999999999998`, though: that's the float error from the
last lesson, and the next section shows how to display it as `30.60`.

> [!JS]
> Coming from JavaScript: f-strings are template literals, `` `${customer}` ``, with a formatting
> language built in, so there's no need for `toFixed()` or `padStart()`.

## Format specs

After the expression, a colon starts a **format spec** that controls how the value is shown. These
are the ones you'll use constantly:

| Spec | Means | `f"{x:spec}"` |
|------|-------|---------------|
| `.2f` | fixed point, 2 decimal places | `29.99` for `x = 29.989` |
| `,` | thousands separators | `1,250,000` |
| `,.2f` | both | `1,250,000.00` |
| `.1%` | percentage (multiplies by 100) | `7.5%` for `x = 0.075` |
| `>10` | right-align in 10 characters | `     29.99` |
| `<10` | left-align in 10 characters | `Tea       ` |
| `^10` | centre in 10 characters | `   Tea    ` |
| `05` | pad with zeros to 5 digits | `00042` |

Width and precision combine: `>10.2f` right-aligns a two-decimal number in 10 characters, which is
exactly what a column of prices needs.

```python
revenue = 1250000
margin = 0.075
print(f"Revenue: {revenue:,} ({margin:.1%} margin)")
print(f"{'Coffee beans':<16}{2:>4}{17:>10.2f}")
print(f"{'Oat milk':<16}{3:>4}{5.85:>10.2f}")
print(f"Invoice {42:05}")
```

The two item rows line up because every column has a fixed width. The `.2f` spec works on ints and
`Decimal`s too, so `17` prints as `17.00`.

One more for debugging: `=` after an expression prints the expression itself, then its value.

```python
subtotal = 25.25
tax_rate = 0.08
print(f"{subtotal=}, {subtotal * tax_rate = :.2f}")
```

```quiz
question: What does `f"{3.14159:>8.2f}"` produce?
options:
  - "\"3.14\""
  - "\"    3.14\""
  - "\"3.14    \""
answer: 1
explain: ".2f rounds to 3.14 (4 characters), and >8 right-aligns that in 8 characters, so four spaces go in front."
```

## Where this leaves you

Strings are immutable sequences: index and slice them, and remember every method returns a new
string. `strip`, `lower`, `replace`, `split` and `join` clean and reshape text, `in` and `find` search
it, and f-strings with format specs turn values into exactly the text you want. The drills put each
of those to work on emails, card numbers, receipt rows and URLs.
