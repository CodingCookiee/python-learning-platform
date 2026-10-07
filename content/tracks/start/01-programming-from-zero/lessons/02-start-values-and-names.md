---
slug: start-values-and-names
title: Values and names
summary: Give a value a name so your program can remember it, use it again and change it, then keep a running total the way a shop's till does.
minutes: 40
exercises:
  - start-name-the-price
  - start-pizza-night
  - start-predict-lives-left
  - start-predict-bill-after-change
  - start-fix-the-space-in-a-name
  - start-fix-name-used-too-early
  - start-scan-the-basket
---

In the last lesson, every number was typed out right where it was used. That's fine for a three-line
receipt, but it gets awkward as soon as something changes. If a coffee goes up in price, you have to
hunt for every `3` that meant "a coffee", and hope you don't miss one.

This lesson shows you how to give a value a **name**, so your program can remember it and you only
write it down once. By the end you'll keep a running total the way a shop's till does: start at zero,
and add each item as it's scanned.

## Values: the things a program works with

Every piece of information a program works with is called a **value**. You've already met the two main
kinds: **numbers**, like `12` and `3.5`, and **text** (strings), like `"Flat white"`, always between
quote marks. When Python meets a sum such as `4 * 3`, it works it out, and the answer, `12`, is a value
like any other.

The quote marks decide which kind a value is. `12` is a number. `"12"` is text that happens to be made
of digits, like the number on a raffle ticket: you'd read it out, but you'd never add it to anything.

Run this, and for each line, say whether the value printed is a number or text.

```python
print("Flat white")
print(3.5)
print(4 * 3)
print("4 * 3")
```

## Giving a value a name

To keep a value so you can use it later, you give it a **name**. Think of a name as a sticky label: you
write a word on it and stick it on a value. From then on, whenever you use that word, Python finds the
value the label is stuck to.

```python
price = 3
print(price)
print("price")
```

The first line sticks the label `price` on the value `3`. The next line has no quote marks around
`price`, so Python treats it as a name, looks it up and prints `3`. The last line does have quote
marks, so `"price"` is just text, and Python prints the word as written.

Under the output, a box headed **Afterwards** lists each name the example made and the value it ended
up with, so you can see what the program remembered. Programmers also call a name a **variable**,
because the value under it can vary (change) while the program runs. You'll see both words.

A name can hold text too, and you can print several names at once, separated by commas. In the
**Afterwards** box, text is shown between single quote marks, like `'Flat white'`: that's Python's way
of saying "this is text". It accepts single or double quote marks; this course uses double ones.

```python
drink = "Flat white"
price = 3
print(drink, "costs", price)
```

## What `=` really means

In maths, `=` means "both sides are equal". In Python it means **store the value on the right under the
name on the left**. This is called **assignment**: you assign a value to a name. Read `price = 3` out
loud as "price is set to 3".

Python always does two things, in this order:

1. It works out the right-hand side, until it's down to a single value.
2. It sticks the name on the left onto that value.

So the right-hand side can be a sum, and it can use names you've already made:

```python
bus_fare = 2
journeys = 5
cost = bus_fare * journeys
print("Journeys this week:", journeys)
print("Cost:", cost)
```

On the third line, Python looks up `bus_fare` (2) and `journeys` (5), works out `2 * 5`, and sticks the
name `cost` on the answer, `10`. Change `journeys` to `7` and run it again: the cost follows, and you
didn't have to work anything out yourself.

```quiz
question: What does the line `total = 5 + 2` do?
options:
  - "Checks whether total is equal to 7"
  - "Works out 5 + 2, then stores 7 under the name total"
  - "Prints 7"
answer: 1
explain: "In Python, = means store: the right-hand side is worked out first, then the name on the left is stuck on the answer. Nothing appears on the screen until you use print."
```

## Changing a value

A label can be peeled off and stuck on something else. Assign a new value to a name, and from then on
the name refers to the new value. Each `print` shows the value the name has at that moment:

```python
score = 0
print("Score:", score)
score = 50
print("Score:", score)
```

Because Python works out the right-hand side first, the same name can even appear on both sides of `=`.
Read `score = score + 10` from right to left: take the current value of `score`, add 10, and stick the
label `score` on the answer. As "equals" it would make no sense, since nothing equals itself plus 10.
As "score is set to score plus 10", it does.

Here's a game where you collect two coins, then bump into a wall. A comment can go at the end of a line,
too: Python ignores everything from the `#` onwards.

```python
score = 0
score = score + 10   # a coin
score = score + 10   # another coin
score = score - 5    # bumped into a wall
print("Score:", score)
```

```quiz
question: "After these three lines run, what is `points`? `points = 5`, then `points = points + 2`, then `points = points + 2`"
options:
  - "5"
  - "7"
  - "9"
answer: 2
explain: Each line starts from the value points has at that moment. 5 + 2 is 7, then 7 + 2 is 9.
```

## A name remembers the answer, not the sum

When you write `total = price * 2`, Python works out `price * 2` straight away and sticks `total` on the
answer. It doesn't remember how it got there, so if `price` changes later, `total` stays as it was:

```python
price = 4
total = price * 2
price = 5
print("Price:", price)
print("Total:", total)
```

The total is still 8, not 10: moving the `price` label doesn't touch `total`. To get a total that uses
the new price, work it out again after the change. Add the line `total = price * 2` just after
`price = 5`, and run it again.

## Choosing names

You can choose almost any name you like, as long as you follow three rules:

- Use only letters, digits and the underscore `_` (on most keyboards, Shift and the minus key). No
  spaces, hyphens or other symbols.
- Don't start with a digit: `seat_2` is fine, `2nd_seat` isn't.
- Capital letters count: `price`, `Price` and `PRICE` are three different names.

Where you'd want a space, use an underscore: `ticket_price`, `items_in_basket`. Python programmers write
most names this way, in lower case, and call the style **snake case**, because the words lie flat along
the line like a snake. Here's what a space does:

```python raises
ticket price = 8
```

`SyntaxError: invalid syntax`. Python read `ticket` as a name, then found a second word where it
expected `=`. A name that starts with a digit gets a `SyntaxError` too, with the puzzling description
`invalid decimal literal`: Python saw the digit and thought you were starting a number.

Beyond the rules, choose names that say what the value is: `total`, not `t`. Python doesn't mind either
way, but people reading your program do, and that includes you next week. Both halves of this program
work out the same thing; only the second tells you what the numbers mean.

```python
a = 60
b = 3
print(a * b)

room_price = 60
nights = 3
print(room_price * nights)
```

## When a name has no value yet

Python runs your program from top to bottom, and a name only exists from the line that gives it a
value. Use it earlier, and Python has nothing to look up:

```python raises
print("Total:", total)
total = 3 + 2
```

`NameError: name 'total' is not defined`. You met `NameError` in the last lesson, when `Print` had the
wrong capital letter. It means "I don't know this name", and **defined** is the programmer's word for
"given a value". The fix here is to swap the two lines.

The other common cause is a typo. A name spelled differently, or with a different capital letter, is a
different name as far as Python is concerned:

```python raises
basket_total = 12
print("You owe", Basket_total)
```

The error quotes the name exactly as you wrote it, `Basket_total`, so compare it letter by letter with
the line that gave the name its value. Here the capital `B` is the problem.

> [!TIP]
> When you see a `NameError`, check two things. Is the name spelled exactly the same everywhere, capital
> letters included? And does the line that gives it a value come before the line that uses it?

```quiz
question: "A program stops with `NameError: name 'tip' is not defined`. Its three lines are `bill = 40`, `print(bill + tip)` and `tip = 5`, in that order. What's the fix?"
options:
  - "Put quote marks around tip"
  - "Move tip = 5 above the print line"
  - "Change tip to Tip"
answer: 1
explain: Python runs from top to bottom, so when it reaches the print line, tip hasn't been given a value yet. Give a name its value first, then use it.
```

## Project: a running total

A shop's till keeps one number, the total so far. It starts at zero, and each item scanned is added to
it. You can do the same:

```python
total = 0
total = total + 3    # bread
total = total + 2    # milk
total = total + 5    # cheese
print("Total:", total)
```

This pattern is called a **running total**: one name that starts at zero and has each new amount added
to it in turn. The `total = 0` at the start matters: without it, the first `total + 3` would stop with
a `NameError`.

Adding to a name is so common that Python has a shortcut. `total += 3` means exactly the same as
`total = total + 3`: "add 3 to total". There's `-=` for taking an amount away, which suits a money-off
coupon. Use whichever form you find clearer.

```python
total = 0
total += 3    # bread
total += 2    # milk
total += 5    # cheese
total -= 1    # coupon, 1 off
print("Total:", total)
```

## What you can do now

You can store a value under a name, use it, change it, and add to it with `=` or `+=`. You know the
rules for names, how to choose good ones, and what a `NameError` is telling you. Next, you'll do more
with text and numbers, and write programs that ask the person using them a question.

The drills below practise each idea in turn, and the last one is a running total, kept the way a till
keeps it. If you get stuck, every drill has hints, and it's fine to use them.
