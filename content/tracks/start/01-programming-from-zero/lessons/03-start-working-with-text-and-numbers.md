---
slug: start-working-with-text-and-numbers
title: Working with text and numbers
summary: Do sums with names, build sentences out of text and numbers, and ask the user a question, turning their answer into a number you can work with.
minutes: 45
exercises:
  - start-predict-join-or-add
  - start-fix-the-ticket-total
  - start-order-summary
  - start-name-for-the-order
  - start-next-birthday
  - start-fix-the-fruit-stall
  - start-shop-till
---

So far, every value in your programs has been typed in by you. Real programs work things out and talk
to the person using them: a till asks how many you'd like, then tells you what you owe. This lesson
shows you how to do sums with the names you met last time, build a sentence out of text and numbers,
and ask a question and use the answer. Along the way you'll meet two new error messages and learn to
read them.

## Sums with names

Arithmetic works on names just as it does on numbers. Python looks up the value stored under each
name, then does the sum.

```python
coffee = 3
cake = 4
total = coffee + cake
print("Total:", total)
```

When a line mixes signs, Python follows the same rule as in maths: `*` and `/` come before `+` and
`-`. Brackets come first of all, so use them when you mean "add these up, then multiply". Two friends
each order a coffee and a cake:

```python
coffee = 3
cake = 4
friends = 2
print(coffee + cake * friends)      # 3 + 8: the cakes were multiplied first
print((coffee + cake) * friends)    # 7 * 2: what we meant
```

Dividing with `/` always gives a decimal number, even when the answer is whole. Python shows it with
`.0` on the end: `10.0` is the same amount as `10`, written as a decimal.

```python
bill = 30
friends = 3
print(bill / friends)
```

## Joining text

`+` does something different with text: it joins two pieces of text into one.

```python
first_name = "Ada"
last_name = "Lovelace"
full_name = first_name + " " + last_name
print(full_name)
```

Unlike the commas in `print`, `+` never adds a space for you. The `" "` in the middle is a piece of
text that holds a single space.

Text that happens to be made of digits is still text, so `+` joins it rather than adding it up.
Compare these two lines:

```python
print("3" + "4")
print(3 + 4)
```

```quiz
question: What does `print("10" + "5")` show?
options:
  - "15"
  - "105"
  - "An error"
answer: 1
explain: Both values are in quote marks, so they're text, and + joins text. Without the quote marks, print(10 + 5) would show 15.
```

## When text meets a number: TypeError

What if you try to join a piece of text and a number? Press **Run** and read the error, last line
first.

```python raises
total = 12
print("Total: " + total)
```

The last line says:

```text
TypeError: can only concatenate str (not "int") to str
```

It has three new words in it, and they're worth learning, because you'll see them often:

- Every value in Python has a **type**, meaning the kind of value it is. Text is a `str` (short for
  string). A whole number is an `int` (short for integer, the maths word for a whole number). A number
  with a decimal point is a `float` (from "floating point", the computer's name for a decimal number).
- **Concatenate** is the programmers' word for join.
- A **TypeError** means you tried something that doesn't work with that type of value.

So the message reads: "I can only join text to text, and you gave me an int." Python won't guess
whether you meant to add or to join, so it stops and lets you decide. One fix is to turn the number
into text first, with `str()`:

```python
total = 12
print("Total: " + str(total))
```

## Values inside a sentence: f-strings

Joining with `+` and `str()` works, but there's a neater way to build a sentence out of text and
values. Put the letter `f` just before the opening quote mark, and you can put values straight into
the text, inside curly brackets `{ }`. Python works out what's inside each pair of brackets and puts
the answer in its place. This is called an **f-string** (the f stands for "formatted").

```python
total = 12
print(f"Total: {total}")
```

Inside the brackets you can put a name, or a whole sum:

```python
item = "muffin"
price = 2
quantity = 3
print(f"{quantity} x {item} at {price} each")
print(f"Total: {price * quantity}")
```

No `str()`, no plus signs, and the spaces go exactly where you type them. That's why f-strings are the
usual way to mix text and values.

The most common slip is forgetting the `f`. Without it, the curly brackets are just more text, and
Python prints them as they are. Run this and compare the two lines:

```python
total = 12
print("Total: {total}")
print(f"Total: {total}")
```

## Asking a question: input()

So far you, the programmer, have typed every value into the program. Most programs ask the person
using them instead: a till asks how many you'd like, a game asks for your name. That person is called
the **user**.

`input()` shows a question, waits for the user to type an answer and press Enter, and gives back what
they typed. Store the answer under a name so you can use it:

```python norun
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")
```

Here's a run where the user typed `Sam`:

```text
What's your name? Sam
Nice to meet you, Sam!
```

Leave a space at the end of the question, inside the quote marks, so the answer doesn't touch the
question mark.

> [!NOTE]
> The examples on this page can't stop and wait for you to type, so the ones that use `input()` have
> no Run button. In the drills you'll find an **Input for Run** box: type your answers there, one per
> line, in the order the program asks for them, then press **Run**.

To try the rest of a program here, put the answer in directly, as if the user had typed it. Change
the name and run it again:

```python
name = "Sam"    # as if the user typed Sam
print(f"Nice to meet you, {name}!")
```

## input() always gives back text

Here's the catch: whatever the user types, `input()` gives it back as text, even when they type
digits. Answer `3` to "How many tickets?" and you get the text `"3"`, not the number 3. Try to add 1
to it and you get the same TypeError as before:

```python raises
tickets = "3"    # what input() gives back when the user types 3
print(tickets + 1)
```

`tickets` holds text, so `+` tries to join, and Python can't join a number to text. The fix is
`int()`, which turns text into a whole number:

```python
tickets = "3"
tickets = int(tickets)
print(tickets + 1)
```

Usually you turn the answer into a number on the same line that asks the question:

```python norun
tickets = int(input("How many tickets? "))
print(f"That's {tickets * 8} for {tickets} tickets.")
```

```text
How many tickets? 3
That's 24 for 3 tickets.
```

Read the first line from the inside out: `input(...)` asks the question and gives back text, `int(...)`
turns that text into a whole number, and `=` stores the number under `tickets`.

For an answer that can have a decimal point, such as a price or a weight, use `float()` instead:

```python
print(float("2.50"))
print(float("4"))
```

Python writes `2.50` as `2.5`, because the zero on the end doesn't change the number. And `float()`
always gives a decimal number, so `"4"` comes back as `4.0`.

```quiz
question: 'The user types 20 when a program runs `age = input("How old are you? ")`. What is stored under `age`?'
options:
  - "The number 20"
  - 'The text "20"'
  - "Nothing, until you use int()"
answer: 1
explain: input() always gives back text, even when the user types digits. To do sums with the answer, turn it into a number with int(age).
```

## When the answer isn't a number: ValueError

What if the user types `three` instead of `3`? `int()` can't turn that into a number, so Python stops
with a different error:

```python raises
tickets = int("three")
```

The last line says:

```text
ValueError: invalid literal for int() with base 10: 'three'
```

A **ValueError** means the type was fine (`int()` does take text) but this particular value isn't one
it can use. "Invalid literal for int() with base 10" is Python's very formal way of saying "this isn't
a whole number written in ordinary digits". The end of the line shows exactly what it was given, in
quote marks: `'three'`.

You get the same error when the answer has a decimal point and the program uses `int()`, because
`int()` only takes whole numbers:

```python raises
kilos = int("2.5")
```

> [!TIP]
> When a program stops with a ValueError, look at the value in quote marks at the end of the message.
> It's what the program was given, and it usually tells you straight away what happened: a typo by the
> user, or `int()` where the program needed `float()`.

```quiz
question: "A fruit stall program asks how many kilos of apples the customer wants, then stops with `ValueError: invalid literal for int() with base 10: '1.5'`. What's the best fix?"
options:
  - "Change int() to float(), so decimal answers work"
  - "Put quote marks around 1.5"
  - "Change int() to str()"
answer: 0
explain: 1.5 kilos is a perfectly good answer, but int() only takes whole numbers. float() turns text with a decimal point into a number.
```

## Putting it together: splitting a bill

Here's a program that uses everything in this lesson. Friends split a restaurant bill evenly:

```python norun
bill = float(input("Total bill: "))
people = int(input("How many people? "))
share = round(bill / people, 2)
print(f"Each person pays {share}")
```

```text
Total bill: 50
How many people? 3
Each person pays 16.67
```

Line by line: the bill can have pence, so it goes through `float()`. The number of people is always
whole, so it goes through `int()`. Then comes the division, and an f-string for the answer.

The new piece is `round()`. 50 shared between 3 is 16.666..., with sixes going on for ever, but money
only goes to two decimal places. `round(bill / people, 2)` rounds the answer to the nearest penny: the
number after the comma says how many decimal places to keep.

> [!NOTE]
> Round every sum of money, even when it looks unnecessary. Inside the computer, most decimal numbers
> are stored as a very close approximation rather than exactly, a little like writing a third as 0.333.
> Once in a while that leaves an answer a tiny fraction away from the exact pence, and rounding to two
> places tidies it up.

Here it is with the answers written in, as if the user had typed them. Try a bill of 60 between 4
people, then 45 between 2:

```python
bill = float("50")    # as if the user typed 50
people = int("3")     # as if the user typed 3
share = round(bill / people, 2)
print(f"Each person pays {share}")
```

## What you can do now

You can do sums with names, join text with `+`, and build sentences with f-strings. You can ask the
user a question with `input()`, turn the answer into a number with `int()` or `float()`, and round
money to the penny. You've also read two new error messages: a TypeError when text and a number are
mixed with `+`, and a ValueError when an answer can't become a number. Next, your programs will start
making decisions.

The drills below finish with a small project: a shop till that asks for a price and a quantity and
works out the cost. When a program asks a question, type your answers in the **Input for Run** box
before you press **Run**.
