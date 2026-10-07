---
slug: start-repeating-things
title: Repeating things
summary: Make Python do the same job many times with for and while loops, go through a list one item at a time, and add up a total as you go.
minutes: 45
exercises:
  - start-predict-the-laps
  - start-fix-the-missing-range
  - start-shopping-list
  - start-add-up-the-bill
  - start-fix-the-game-score
  - start-count-the-passes
  - start-times-table
  - start-countdown
---

Computers are very good at doing the same thing over and over, quickly and without getting bored. So
far, though, every line in your programs has run once. To do something three times, you'd copy the line
three times; to do it a hundred times, you'd copy it a hundred times. This lesson shows you a better way:
a **loop**, an instruction that repeats other instructions.

## Doing something many times

Here's a birthday cheer, written out the long way. Press **Run**.

```python
print("Hip hip hooray!")
print("Hip hip hooray!")
print("Hip hip hooray!")
```

It works, but copying lines gets tiring, and it's easy to miscount. Here is the same cheer with a loop:

```python
for cheer in range(3):
    print("Hip hip hooray!")
```

Both programs print the same three lines. The second one says "do this three times" instead of writing
it out three times, so to cheer ten times you only change one number. Try it: change the `3` to `10` and
press **Run** again.

## Counting with for and range

A `for` loop goes through a series of values, one at a time, and runs the same instructions for each
one. `range()` makes a series of whole numbers for it to go through. Run this and look at the numbers it
prints:

```python
for number in range(5):
    print(number)
```

Here's what each part does:

- `range(5)` gives five numbers: 0, 1, 2, 3 and 4. It starts at 0 and stops just *before* 5. Starting
  from 0 feels odd at first, but it's how most programming languages count, and you soon get used to it.
- `for number in range(5):` means "take each of those numbers in turn, and keep it under the name
  `number`". This name is called the **loop variable**: an ordinary name that the loop changes each time
  round. The first time round it's 0, then 1, and so on. You can pick any name you like.
- The line ends with a colon `:`, and the instructions to repeat are indented underneath it, as a block,
  just like the lines under an `if`. This block is called the loop's **body**.

To start somewhere other than 0, give `range()` two numbers: where to start, and where to stop. It still
stops just before the second number, so `range(1, 6)` gives 1 to 5. Here's what you'd have saved by the
end of each week if you put 5 aside every week:

```python
for week in range(1, 6):
    print(f"Week {week}: saved {week * 5}")
```

The body uses the loop variable, so each line is different: week 1, then week 2, up to week 5.

Lines that aren't indented aren't part of the loop. They run once, after the loop has finished:

```python
for cheer in range(3):
    print("Hip hip hooray!")
print("Happy birthday!")
```

Try indenting the last line too, so it lines up with the line above it, and run it again. Now it's
inside the loop, so it's repeated as well.

```quiz
question: What numbers does `range(2, 6)` give?
options:
  - "2, 3, 4, 5, 6"
  - "2, 3, 4, 5"
  - "3, 4, 5, 6"
answer: 1
explain: range starts at the first number and stops just before the second, so 6 itself isn't included.
```

## When a for loop won't run: reading the error

Two slips are common with `for`. Run each example and, as always, read the last line of the error first.

**A number instead of a range.** "Do this three times" sounds like `for cheer in 3:`, but Python can't go
through a single number:

```python raises
for cheer in 3:
    print("Hip hip hooray!")
```

The last line is `TypeError: 'int' object is not iterable`. A `TypeError` means a value is the wrong kind
for the job. `int` is Python's short name for a whole number (the same word as in `int()`), and
**iterable** is programmers' word for something a loop can go through one value at a time, such as a
range. So the message says "a whole number isn't something I can go through". Give the loop a series of
values instead: `range(3)`.

**Nothing indented under the `for`.** Like an `if`, a `for` line ends with a colon and needs at least one
indented line underneath it:

```python raises
for cheer in range(3):
print("Hip hip hooray!")
```

This time it's `IndentationError: expected an indented block after 'for' statement on line 1`. Indent the
`print` line by four spaces and the program runs.

## Going through a list

Often the things you want to go through aren't counting numbers but a set of values: the items on a
shopping list, the prices on a bill, the scores in a game. Python keeps a set of values together in a
**list**: values written between square brackets `[ ]`, separated by commas. You can keep a whole list
under one name.

```python
shopping = ["bread", "milk", "eggs"]
print(shopping)
```

A `for` loop can go through a list one item at a time, from first to last:

```python
shopping = ["bread", "milk", "eggs"]
for item in shopping:
    print(f"- {item}")
```

The loop variable `item` is `"bread"` the first time round, then `"milk"`, then `"eggs"`. When there are
no items left, the loop stops. Add `"apples"` to the end of the list (inside the brackets, after a comma)
and run it again: the loop picks up the new item without any other change.

Lists can hold numbers too. `len()`, short for "length", tells you how many values a list holds:

```python
scores = [12, 7, 20, 15]
print(len(scores), "scores")
```

## Building up a total

A loop can keep a running total, the way a cashier adds up a basket one item at a time. It takes three
steps:

1. Before the loop, make a name for the total and start it at 0.
2. Inside the loop, add each value to it with `+=`.
3. After the loop, that name holds the total.

```python
prices = [4, 12, 3]
total = 0
for price in prices:
    total += price
    print(f"Added {price}, total so far: {total}")
print(f"Total: {total}")
```

Run it and follow along: `total` starts at 0, then becomes 4, then 16, then 19. The last line isn't
indented, so it runs once, at the end, when every price has been added.

> [!WARNING]
> Put `total = 0` *before* the loop, not inside it. Inside the loop, it sets the total back to 0 every
> time round, so all you're left with is the last price.

Here's that mistake. Python doesn't show an error, because nothing is wrongly written: the program just
gives the wrong answer. Run it and compare.

```python
prices = [4, 12, 3]
for price in prices:
    total = 0
    total += price
print(f"Total: {total}")
```

```quiz
question: "In that broken version, `total = 0` is inside the loop. With the prices `[5, 10, 20]`, what would it print?"
options:
  - "Total: 35"
  - "Total: 20"
  - "Total: 0"
answer: 1
explain: "Each time round, total goes back to 0 and then the price is added. After the last time round it holds only the last price, 20."
```

## Loops that make decisions

The body of a loop can hold any instructions, including an `if`. The `if` is checked each time round,
for each value in turn:

```python
temperatures = [14, 22, 19, 25]
for temperature in temperatures:
    if temperature >= 20:
        print(temperature, "is warm: shorts weather")
    else:
        print(temperature, "is cool: bring a jacket")
```

There are two levels of indentation here. The `if` and `else` are inside the loop, so they're indented
once. The `print` lines are inside the `if` and `else`, so they're indented twice. Python uses the
indentation to know which lines belong to what.

Putting an `if` inside a loop is also how you count things. It's the same idea as a total: start at 0
before the loop, and add 1 each time the `if` matches.

```python
temperatures = [14, 22, 19, 25, 21]
warm_days = 0
for temperature in temperatures:
    if temperature >= 20:
        warm_days += 1
print(f"{warm_days} of {len(temperatures)} days were warm")
```

Change some of the temperatures and run it again: the count and the number of days both follow along.

## Repeating until something changes: while

Sometimes there's no list to go through and no fixed number of times. You want to keep going *until*
something happens. That's what a `while` loop is for. It repeats its body for as long as a condition is
`True`, checking the condition again before each time round.

```python
lives = 3
while lives > 0:
    print(f"Lives left: {lives}")
    lives -= 1
print("Game over")
```

`lives -= 1` takes 1 away from `lives`: it's the `-=` from values and names, short for
`lives = lives - 1`. Follow the loop through:

- `lives` is 3, and `3 > 0` is `True`, so the body runs: it prints, and `lives` becomes 2.
- The same happens with 2, then with 1.
- Now `lives` is 0, and `0 > 0` is `False`, so the loop stops, and Python carries on with the line after
  it.

> [!TIP]
> Use `for` when you know what to go through: a list, or a range of numbers. Use `while` when you want
> to keep going until something changes and can't tell in advance how many times that will take.

Here's a question with no fixed number of times: if you save 15 a week, how many weeks until you have at
least 100?

```python
savings = 0
weeks = 0
while savings < 100:
    savings += 15
    weeks += 1
print(f"After {weeks} weeks you have {savings}")
```

Change the 15 to 20 and run it again. The loop works out the new number of weeks by itself.

## When a loop never stops

A `while` loop only stops when its condition becomes `False`, so something in the body has to change,
step by step, towards that. Here is the lives loop with the `lives -= 1` line forgotten:

```python norun
lives = 3
while lives > 0:
    print(f"Lives left: {lives}")
print("Game over")
```

`lives` stays 3 for ever, so `lives > 0` is always `True`. The program prints `Lives left: 3` again and
again and never reaches `Game over`. This is called an **endless loop** (programmers also say an
"infinite loop"). It has no **Run** button here, because it would never finish.

How to spot one:

- The program keeps running and never finishes, or prints the same line over and over.
- On this site, a program that runs for too long is stopped after a few seconds, with a message telling
  you to look for a loop that never ends. In a drill, the tests say `Took longer than 2s`.

When it happens, look at the `while` line and ask: what would make this condition `False`? Then check
that the body really changes that name, and in the right direction. `lives += 1` would be endless too:
the lives go up, never down to 0.

```quiz
question: "This loop never stops: `count = 5`, then `while count > 0:` with `print(count)` indented underneath. What's missing?"
options:
  - "count -= 1 inside the loop, under the print"
  - "A print after the loop"
  - "Brackets around count > 0"
answer: 0
explain: "Nothing in the body changes count, so count > 0 stays True for ever. Taking 1 away each time round brings it down to 0, and then the loop stops."
```

## What you can do now

You can make Python repeat work: `for` with `range()` to count, `for` over a list to go through its
values one at a time, a total built up inside a loop, an `if` inside a loop to treat values differently,
and `while` to keep going until something changes. You also know what an endless loop looks like and
how to find the cause.

The drills below finish with two small projects: a times table and a countdown. Both ask the user for a
number with `input()`, so remember to turn the answer into a number with `int()` before you use it, and
type your answer in the **Input for Run** box when you try them. If you get stuck, every drill has hints,
and it's fine to use them.
