---
slug: numbers
title: Numbers
summary: Whole numbers that never overflow, floats that can't store 0.1 exactly, and Decimal for money.
minutes: 35
exercises:
  - numbers-predict-operators
  - numbers-boxes-needed
  - numbers-make-change
  - numbers-price-with-tax
---

A customer buys two items at 10 cents and 20 cents, and your checkout does this:

```python
0.1 + 0.2
```

That isn't a Python bug. Every language that uses standard floating-point numbers (JavaScript
included) gives the same answer. By the end of this lesson you'll know why it happens, which number
type to reach for instead, and what Python's division and rounding operators really return.

## Two kinds of number: int and float

Python has two everyday number types. An `int` is a whole number; a `float` is a number with a
fractional part, stored in binary floating point. A literal with a decimal point is a float, one
without is an int.

```python
quantity = 3
unit_price = 4.50
type(quantity), type(unit_price), type(quantity * unit_price)
```

Mixing the two gives a float, because a float can hold anything an int can (approximately), but not
the other way round.

Python's `int` has **arbitrary precision**: it grows to as many digits as the value needs and never
overflows. You can write long literals with underscores to make them readable; Python ignores them.

```python
views_this_year = 12_500_000_000
2 ** 100, views_this_year * 1_000
```

> [!JS]
> Coming from JavaScript: every JS `number` is a 64-bit float, so integers lose precision past
> `Number.MAX_SAFE_INTEGER`. Python's `int` is exact at any size, with no `BigInt` needed.

## Three kinds of division

Python has three division operators, and they answer different questions:

| Operator | Name | `17 ? 5` | Always returns |
|----------|------|----------|----------------|
| `/` | true division | `3.4` | a float, even for `10 / 2` |
| `//` | floor division | `3` | an int when both sides are ints |
| `%` | remainder (modulo) | `2` | what's left over after `//` |

```python
minutes = 135
minutes / 60, minutes // 60, minutes % 60
```

135 minutes is 2.25 hours, or 2 whole hours with 15 minutes left over. When you want both parts at
once, `divmod` returns them as a pair:

```python
hours, mins = divmod(135, 60)
hours, mins
```

`//` rounds **down**, towards minus infinity, not towards zero. That only matters for negative
numbers, but there it matters a lot: `-7 // 2` is `-4`, because -3.5 rounded down is -4. The
remainder follows the same rule, so `a == (a // b) * b + a % b` always holds, and `%` with a positive
divisor is never negative.

```python
-7 // 2, -7 % 2, divmod(-7, 2)
```

> [!JS]
> Coming from JavaScript: JS `%` takes the sign of the left side (`-7 % 3` is `-1`); Python's takes
> the sign of the right side (`-7 % 3` is `2`). And `10 / 2` is `5.0` in Python, a float, not `5`.

```quiz
question: What does `-17 // 5` evaluate to?
options:
  - "-3"
  - "-4"
  - "-3.4"
answer: 1
explain: "// rounds down, towards minus infinity. -17 / 5 is -3.4, and rounding -3.4 down gives -4, not -3."
```

## Powers and absolute values

`**` raises to a power. It works on ints (exactly), on floats, and with fractional or negative
exponents, which give floats. `abs()` strips the sign.

```python
monthly_growth = 1.05
round(1000 * monthly_growth ** 12, 2), 2 ** 0.5, 2 ** -1, abs(-42.5)
```

> [!WARNING]
> `**` binds tighter than a leading minus, so `-2 ** 2` is `-(2 ** 2)`, which is `-4`. Write
> `(-2) ** 2` when you mean "minus two, squared".

## Why 0.1 + 0.2 isn't 0.3

A float stores a number as a binary fraction, a sum of halves, quarters, eighths and so on, in 64
bits. Some decimal numbers can't be written that way exactly, just as 1/3 can't be written exactly in
decimal. 0.1 is one of them, so Python stores the nearest binary fraction instead. You can see the
exact value it stores by handing the float to `Decimal`, which shows every digit:

```python
from decimal import Decimal

Decimal(0.1)
```

0.1 is really stored as a hair more than 0.1, and so is 0.2. Add the two tiny errors together and the
result lands on a different float from the one nearest 0.3. Python shows a float as the shortest text
that reads back as the same float, which is why most floats look clean and this one doesn't.

The practical rule: **never compare computed floats with `==`**. Ask whether they're close instead:

```python
import math

total = 0.1 + 0.2
total == 0.3, math.isclose(total, 0.3)
```

Floats are the right choice for measurements (distances, temperatures, durations, averages), where
a rounding error in the 16th digit is meaningless. They're the wrong choice for money, where a
customer notices a missing cent.

## round() rounds halves to even

`round(x)` gives the nearest int, and `round(x, 2)` gives the nearest float with two decimal places.
When a number is exactly halfway, Python rounds to the **even** neighbour. This is called banker's
rounding:

```python
round(2.5), round(3.5), round(0.5), round(-2.5)
```

Rounding every half up pushes totals slightly upwards over thousands of values; rounding to even is
unbiased, because half the halves go up and half go down. It surprises people who learnt "round half
up" at school, so check which rule your business needs.

There's a second surprise waiting when you round floats to decimal places:

```python
round(2.675, 2)
```

2.675 can't be stored exactly either: the float is actually 2.67499999…, so rounding correctly gives
2.67. Neither rounding rule is at fault. The number was never 2.675 to begin with.

```quiz
question: What does `round(4.5)` return?
options:
  - "5"
  - "4"
  - "4.0"
answer: 1
explain: "4.5 is exactly halfway, so round() picks the even neighbour, 4. With no second argument it returns an int, not a float."
```

## Converting with int() and float()

`int()` and `float()` build numbers from strings (which is how numbers arrive from users, files and
APIs), and from each other. Whitespace around the digits is allowed.

```python
int("42"), int(" 42 "), float("4.50"), float("1e3"), int(3.99), int(-3.99)
```

Notice that `int()` on a float **truncates**: it drops the fractional part, moving towards zero. It
doesn't round. Going the other way, `str()` turns any number back into text.

`int()` refuses anything that isn't a whole number written in digits. It won't guess:

```python raises
int("3.5")
```

```python raises
float("12 apples")
```

Both raise `ValueError`, with a message quoting the text that failed. To turn `"3.5"` into an int,
be explicit about it: `int(float("3.5"))` truncates to 3, and `round(float("3.5"))` rounds to 4.
Lesson 6 shows how to check input before you convert it.

> [!JS]
> Coming from JavaScript: `parseInt("12 apples")` quietly returns `12`, and `Number("")` is `0`.
> Python raises an error for both, so bad data stops at the door instead of spreading.

## Decimal for money

The `decimal` module stores numbers in base 10, exactly as you write them, so 0.1 really is 0.1.
Build a `Decimal` from a **string**, never from a float, or you copy the float's error in with it
(you saw `Decimal(0.1)` above).

```python
from decimal import Decimal

Decimal("0.1") + Decimal("0.2") == Decimal("0.3"), Decimal("8.50") * 3
```

Decimals remember their precision: `Decimal("8.50") * 3` is `25.50`, not `25.5`. Ints mix with them
freely, but floats don't, because mixing would reintroduce the error Decimal exists to avoid:

```python raises
from decimal import Decimal

Decimal("19.99") + 0.5
```

To round money to the cent, use `quantize`, which rounds to the same number of places as the
`Decimal` you pass it. It rounds halves to even by default, like `round()`; pass
`rounding=ROUND_HALF_UP` for the "halves go up" rule most receipts use.

```python
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")
tax = Decimal("2.625")
tax.quantize(CENT), tax.quantize(CENT, rounding=ROUND_HALF_UP)
```

> [!TIP]
> Many systems avoid the question entirely by storing money as an int number of cents: 1999 instead
> of 19.99. Integer arithmetic is exact, and you only divide by 100 when you display the amount.

## The math module

Anything beyond arithmetic lives in the `math` module, which you import once at the top of a file.
The functions you'll use most:

```python
import math

pages = math.ceil(47 / 10)    # 47 results, 10 per page: round up
math.floor(-2.5), math.trunc(-2.5), pages, math.sqrt(144), round(math.pi, 4)
```

- `math.floor` rounds down and `math.ceil` rounds up, both returning ints.
- `math.trunc` drops the fraction, like `int()`.
- `math.sqrt`, `math.pi` and `math.isclose` do what their names say.

## Where this leaves you

Use `int` for counts, `float` for measurements and `Decimal` (or int cents) for money. `/` always
gives a float, `//` and `%` split a number into whole parts and a remainder, and `round()` rounds
halves to even. The drills make you predict those operators, then use them on boxes, coins and tax.
