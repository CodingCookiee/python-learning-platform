---
slug: start-your-first-function
title: Your first function
summary: Give a set of instructions a name, hand it inputs and get a result back, then put everything you've learned together in a number-guessing game.
minutes: 45
exercises:
  - start-def-shop-announcement
  - start-fix-define-before-calling
  - start-return-split-bill
  - start-predict-return-or-print
  - start-fix-forgotten-return
  - start-hint-higher-or-lower
  - start-number-guessing-game
---

You've been using functions since your very first program. `print`, `input` and `int` are all
**functions**: named sets of instructions that someone else wrote, which you can use whenever you like
by writing the name followed by round brackets. Using a function is called **calling** it.

```python
print("Two tickets cost", int("8") * 2)
```

That one line calls two functions. `int` turns the text `"8"` into the number 8, and `print` shows the
result. You don't need to know how either of them works inside. You only need the name, and what to
put in the brackets.

In this lesson you'll write functions of your own. At the end, you'll use them, together with
everything else you've learned, to build a small game.

## Writing your own function

Think of a recipe card. Once "Pancakes" is written at the top of a card with the steps underneath, you
can say "make pancakes" instead of reading out every step. A function works the same way: you write the
steps once, give them a name, and use the name from then on.

```python
def welcome():
    print("Welcome to the Corner Café!")
    print("Today's special: tomato soup")
```

Press **Run**. Nothing appears, and that's expected. This code **defines** the function: it writes the
recipe card, but nobody has asked for the recipe yet. Here are the parts:

- `def`, short for "define", says "a new function starts here".
- `welcome` is the function's name. It follows the same rules as the names you give to values:
  lowercase, with underscores between words.
- The round brackets `()` come straight after the name. They're empty for now.
- The colon `:` ends the first line, just as it does after `if` and `for`.
- The indented lines underneath are the function's **body**: the instructions that run each time the
  function is called.

To run the body, call the function: write its name, then the brackets.

```python
def welcome():
    print("Welcome to the Corner Café!")
    print("Today's special: tomato soup")


welcome()
welcome()
```

Two calls, so the two lines are printed twice. The brackets are what tell Python "run it now": the name
on its own, without them, doesn't run anything.

> [!TIP]
> A function's body can't be empty. While you're still working out what goes in it, you can write `...`
> (three dots) as the body. It means "nothing here yet". Some drills start like that, and you replace
> the dots with your own lines.

Python reads your program from top to bottom, and that includes `def`. If you call a function on a line
above its `def`, Python hasn't read the recipe card yet. Press **Run** and read the error:

```python raises
order_ready()


def order_ready():
    print("Your order is ready!")
```

The last line says `NameError: name 'order_ready' is not defined`: Python met a name it doesn't know
yet. The fix is to move the call below the `def`. That's why programs usually put their functions at
the top, and the instructions that use them underneath.

```quiz
question: 'A program has only two lines: `def cheer():` and, indented under it, `print("Hooray!")`. What does it print?'
options:
  - "Hooray!"
  - "Nothing"
  - "An error"
answer: 1
explain: The program defines cheer but never calls it, so the body never runs. Add cheer() underneath, with no indent, and it prints Hooray!
```

## Giving a function inputs

`welcome` does exactly the same thing every time. Most useful functions take an input and do something
with it, the way `print` shows whatever you give it.

```python
def greet(name):
    print(f"Hello, {name}! Your table is ready.")


greet("Ada")
greet("Sam")
```

The `name` in the brackets of the `def` is a **parameter**: a name for a value the function will be
given when it's called. The value you put in the brackets when you call it, like `"Ada"`, is an
**argument**. On the first call, `name` holds `"Ada"`. On the second, it holds `"Sam"`. Same
instructions, different value.

A function can take several inputs. Separate them with commas, both in the `def` and in the call.
Python matches them up in order: the first argument goes to the first parameter, the second to the
second, and so on.

```python
def receipt_line(item, price):
    print(f"{item}: {price}")


receipt_line("Coffee", 3)
receipt_line("Muffin", 2)
```

Try adding a third call, for a sandwich that costs 5, and run it again.

## Handing back a result with return

Here's a function that works out a 10% tip on a restaurant bill. It prints the tip:

```python
def tip(bill):
    print(bill * 0.1)


tip(50)
```

It shows `5.0`. So far, so good. Now try to use the tip: add it to the bill to get the total.

```python raises
def tip(bill):
    print(bill * 0.1)


total = 50 + tip(50)
print("Total:", total)
```

Python prints `5.0`, then stops with a `TypeError` that ends `for +: 'int' and 'NoneType'`. That's
because `print` only **shows** a value on the screen. The function didn't hand anything back to the line
that called it. When a function hands nothing back, the call gives Python's value for "nothing", which
is called `None`. `NoneType` is the type of `None`, so the error is saying "you tried to add a number and
nothing".

The fix is `return`:

```python
def tip(bill):
    return bill * 0.1


total = 50 + tip(50)
print("Total:", total)
```

`return` **hands a value back** to the line that called the function. Python then uses that value in
place of the call, as if you'd typed it there: `50 + tip(50)` becomes `50 + 5.0`, which is `55.0`.
`return` also ends the function straight away, so any lines after it in the body don't run.

So: `print` shows, `return` hands back. A function that returns doesn't show anything by itself. To see
what it hands back, print it: `print(tip(50))`.

> [!WARNING]
> If a result comes out as `None`, or an error mentions `NoneType`, look at the function. It probably
> prints its answer, or works it out and never returns it.

Money needs one more step. Computers store most decimal numbers very closely, but not always exactly, so
a sum with money can come out with a long tail of digits. A 15% tip on 42.80 should be 6.42:

```python
print(42.80 * 0.15)
```

The fix is `round`, which you met when splitting a bill. You can call it now as what it is, a function
that comes with Python: `round(number, 2)` rounds a number to 2 decimal places, which is exactly what you
want for money.

```python
def tip(bill):
    return round(bill * 0.15, 2)


print("Tip:", tip(42.80))
print("Tip:", tip(36.40))
```

```quiz
question: 'A function called double has one line in its body: `print(n * 2)`. After `result = double(4)`, what is in result?'
options:
  - "8"
  - "None"
  - "The text \"8\""
answer: 1
explain: The function shows 8 on the screen, but it never returns anything, so the call hands back None. With return n * 2 instead, result would hold 8.
```

## Why functions are worth it

Here's a cinema's ticket-price rule, written as a function:

```python
def ticket_price(age):
    if age < 12:
        return 6
    elif age >= 65:
        return 7
    else:
        return 10


print("Child:", ticket_price(8))
print("Adult:", ticket_price(35))
print("Senior:", ticket_price(70))
```

Each branch has its own `return`. Whichever one runs ends the function and hands back that price.

Why not just write the `if`, `elif` and `else` wherever you need a price?

- **No repeated code.** The rule is written once. Without the function, a program that needs a price
  in three places has three copies of the same lines.
- **One place to fix.** If the adult price goes up to 11, you change one line, and every price in the
  program follows. With three copies, it's easy to change two and forget the third.
- **Easier to read.** `ticket_price(70)` says what it does. Six lines of `if` and `elif` make the reader
  work it out.

Try it: change the adult price from 10 to 11, and run it again.

## Calling a function inside a loop

Functions and loops work well together. The loop goes through the values, and the function does the
work for each one. Here's a family of four buying cinema tickets:

```python
def ticket_price(age):
    if age < 12:
        return 6
    elif age >= 65:
        return 7
    else:
        return 10


total = 0
for age in [8, 35, 41, 70]:
    price = ticket_price(age)
    print(f"Age {age}: {price}")
    total += price

print("Total:", total)
```

Each time round the loop, `age` holds the next value from the list, and `ticket_price(age)` is called
with it. The loop stays short because the rule lives in the function. Add another age to the list and
run it again.

## Picking a random number

Games need surprises. Python comes with extra sets of ready-made functions for all sorts of jobs, kept
out of the way until you ask for them. The line `import random` brings in the set for random numbers,
which is called `random`. Put it at the very top of your program.

```python
import random

roll = random.randint(1, 6)
print("You rolled", roll)
```

`random.randint(1, 6)` calls the `randint` function from `random` (the dot means "the one that belongs
to"). It picks a whole number from 1 to 6, and both 1 and 6 can come up, like rolling a dice. The name is
short for "random integer", and an integer, as you saw with `int`, is a whole number.

Press **Run** a few times. The number changes each time.

## The finale: a number-guessing game

Here's the game you're about to build. The computer picks a secret number from 1 to 20. You guess.
After each guess it tells you whether the secret is higher or lower, and when you get it right, it says
how many guesses you took.

```text
Guess a number from 1 to 20: 10
higher
Guess a number from 1 to 20: 15
lower
Guess a number from 1 to 20: 12
correct
You win! Guesses: 3
```

You've already met every piece it needs:

1. A function, `hint(secret, guess)`, that returns `"higher"`, `"lower"` or `"correct"`. Inside, it's an
   `if`, an `elif` and an `else`.
2. `random.randint(1, 20)` to pick the secret number.
3. A `while` loop that keeps going until the hint is `"correct"`. Each time round, it asks for a guess
   with `input()`, turns it into a number with `int()`, and prints the hint.
4. A count of guesses that goes up by one each time round, with `+= 1`.

The last two drills build it: first the `hint` function on its own, then the game around it. Take it
one step at a time, and press **Run** as you go.

```quiz
question: 'The game loop starts with `while result != "correct":`. When does the loop stop?'
options:
  - "After 20 guesses"
  - "As soon as the hint is correct"
  - "It never stops"
answer: 1
explain: The loop keeps going while the hint is anything other than "correct". The right guess makes the hint "correct", so the loop stops straight after it.
```

## Tying your white belt

This is the last lesson of Start here. Finish the drills below, game included, and your white belt is
tied.

Look at what you can do now. You write programs that show text and numbers, keep values under names,
ask questions and use the answers, make decisions, repeat work, and wrap instructions up in functions of
your own. Those few ideas are the heart of programming.

Next comes module 1, *Python for developers*. Don't let the name put you off: after this, you're one of
those developers. It starts from the ideas you've just practised, so much of it will feel like a review.

Well done. Enjoy your game.
