---
slug: input-and-output
title: Input and output
summary: Read what people type, turn it into numbers safely, and print results that line up.
minutes: 35
exercises:
  - io-welcome-back
  - io-fix-coffee-order
  - io-ticket-order
  - io-parse-line-item
---

Every program so far has had its data written into the code. Real programs ask for it: a quantity, a
name, a line of an order. This lesson covers reading input, turning it into the types you need
without crashing on bad data, and printing results people can read. At the end you'll have
everything the module's capstone, a receipt printer, needs.

## input() always returns a string

`input(prompt)` prints the prompt, waits for the user to type a line and press Enter, and returns
what they typed, without the newline at the end:

```python norun
name = input("What's your name? ")
quantity = input("How many coffees? ")
print(f"Thanks {name}, that's {quantity} coffees.")
```

```text
What's your name? Ada
How many coffees? 3
Thanks Ada, that's 3 coffees.
```

Examples on this page can't ask you for input, so from here on a line like `quantity = "3"` stands in
for what `input()` would hand back. The important word there is **hand back a string**. `input()`
returns a `str` every time, even when the user types digits:

```python
quantity = "3"          # what input() returns when someone types 3
type(quantity), quantity * 2
```

`"3" * 2` is `"33"`: string repetition, not arithmetic. And adding a number to it fails outright:

```python raises
quantity = "3"
quantity + 1
```

> [!JS]
> Coming from JavaScript: like the browser's `prompt()`, `input()` always returns a string, but
> Python won't coerce it for you: `"3" + 1` is an error, not `"31"`.

## Converting what people type

Convert the string as soon as you've read it, so the rest of the program works with real numbers.
`int()` and `float()` ignore spaces at either end, which is handy, because people type them.

```python
raw_quantity = " 3 "     # input() keeps whatever spaces the user typed
raw_price = "4.50"

quantity = int(raw_quantity)
price = float(raw_price)
quantity * price
```

The usual pattern is to read and convert in one line: `quantity = int(input("How many? "))`. That's
fine until someone types `three`, `2.5` or nothing at all, and `int()` raises `ValueError`:

```python raises
raw_quantity = "three"
int(raw_quantity)
```

For a script you run yourself that may be acceptable. For anything other people use, check the text
before you convert it.

## Checking before you convert

String methods can tell you whether text looks like a whole number. `isdigit()` is `True` when a
string is non-empty and every character is a digit:

```python
"12".isdigit(), "three".isdigit(), "".isdigit(), "-3".isdigit(), "2.5".isdigit(), " 12".isdigit()
```

Strip the text first (a leading space counts as "not a digit"), then check, and only then convert:

```python
raw_quantity = " 12 "

cleaned = raw_quantity.strip()
if cleaned.isdigit():
    quantity = int(cleaned)
    print(f"Adding {quantity} to your basket")
else:
    print("Please enter a whole number, like 3")
```

Run it, then try `"twelve"`, `""` and `"-3"`. `isdigit()` rejects minus signs and decimal points, which
is exactly right for a quantity, but no good for a price like `"4.50"`. For those, the cleanest tool
is to try the conversion and catch the failure:

```python
raw_price = "4.5O"    # a typo: the letter O instead of a zero

try:
    price = float(raw_price)
except ValueError:
    price = None
price
```

`try` runs its block, and if that block raises a `ValueError`, Python jumps to the `except` block
instead of stopping. That's only a first look: module 6 covers exceptions properly. For now,
`isdigit()` for whole numbers and `try` for decimals will cover everything this module needs.

## print() with sep and end

Lesson 1 introduced `print`'s two options. `sep` goes between the values, and `end` goes after the
last one instead of a newline. `print()` on its own prints an empty line, which is how you space out
sections of output.

```python
print("Order", 1042, "confirmed")
print("Coffee beans", "Oat milk", "Croissant", sep=", ")
print("Paid", end=" ")
print("in full")
print()
print("Thank you!")
```

`print` converts every value with `str()` for you, so numbers don't need converting. It also returns
`None`: it's for showing things, so build strings with f-strings when you need them as values.

```quiz
question: What does `print("A", "B", sep="-", end="!")` followed by `print("C")` show?
options:
  - "A-B!C"
  - "A-B! and then C on a new line"
  - "A B-!C"
answer: 0
explain: "sep puts - between A and B, and end replaces the newline with !, so the next print carries on the same line: A-B!C."
```

## Aligned output with f-strings

Output that other people read should line up. Give every column a fixed width with the format specs
from lesson 4: text left-aligned (`<`), numbers right-aligned (`>`), money with `.2f`. Build the rule
lines with `*` so they always match the width.

```python
from decimal import Decimal

WIDTH = 34
print(f"{'Item':<20}{'Qty':>4}{'Total':>10}")
print("-" * WIDTH)
print(f"{'Coffee beans':<20}{2:>4}{Decimal('17.00'):>10.2f}")
print(f"{'Oat milk':<20}{3:>4}{Decimal('5.85'):>10.2f}")
print("-" * WIDTH)
print(f"{'Total':<24}{Decimal('22.85'):>10.2f}")
```

The header and the total row use the same widths as the item rows (`<24` is the name and quantity
columns together), which is what makes every column line up.

> [!TIP]
> Keep the widths in named constants, `NAME_WIDTH = 20`, and use them inside the spec:
> `f"{name:<{NAME_WIDTH}}"`. Changing one number then reflows the whole table.

## Reading until a blank line

A program that reads a list of things, such as the lines of an order, needs to keep asking until
the user is done. The usual signal is a blank line: pressing Enter on an empty line makes `input()`
return `""`, which is falsy. Loops are the next module's subject, but the shape you need for the
capstone is short enough to use now:

```python norun
while True:
    line = input("Item (blank to finish): ")
    if not line:
        break
    print(f"Added: {line}")

print("Order complete")
```

`while True:` repeats its block forever, and `break` leaves the loop. So the program reads a line,
stops if it's empty, and otherwise handles it and goes round again.

```quiz
question: A user presses Enter without typing anything. What does `input()` return?
options:
  - "None"
  - "\"\" (an empty string)"
  - "\"\\n\" (a newline)"
answer: 1
explain: "input() strips the newline from the end of what was typed, so an empty line comes back as \"\", which is falsy. That's why `if not line:` detects it."
```

## Structuring a small program

Even a 30-line script is easier to read and to fix when it has a shape. Put the pieces in this order:

1. Imports at the top.
2. Constants next, in capitals: `TAX_RATE = Decimal("0.08")`.
3. Small functions that do one job each, like formatting a line.
4. The main flow last: read the input, compute, print.

That last part usually sits under an `if` that looks strange the first time:

```python norun
from decimal import Decimal

UNIT_PRICE = Decimal("3.20")


def format_total(quantity):
    return f"{quantity} coffees: {quantity * UNIT_PRICE:.2f}"


if __name__ == "__main__":
    quantity = int(input("How many coffees? "))
    print(format_total(quantity))
```

Every Python file has a `__name__`. When you run a file directly, Python sets it to `"__main__"`.
When another file **imports** it, to reuse `format_total` for example, `__name__` is the file's
module name instead, and the block under the `if` doesn't run. So the guard means "only read input
and print when I'm the program being run". The drill tests on this site import your code in exactly
that way, which is why the last drill in this lesson asks you to keep the guard. Here's the value in
a file that's being run:

```python
print(__name__)
__name__ == "__main__"
```

Module 3 covers functions, modules and imports in depth. For now, "functions and constants at the
top, the program under the guard" is the whole rule.

## Where this leaves you

`input()` always returns a string: strip it, check it, then convert it. `print` takes `sep` and `end`,
and fixed-width f-string columns make output line up. A `while True` loop with `break` reads until a
blank line, and `if __name__ == "__main__":` keeps a file importable. That's every piece of the
receipt printer, the module's capstone, once you've done the drills.
