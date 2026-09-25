---
slug: defining-functions
title: Defining functions
summary: def, return, the None you get when you forget it, and docstrings that say what a function is for.
minutes: 30
exercises:
  - functions-line-total
  - functions-return-not-print
  - functions-predict-none
  - functions-write-docstring
  - functions-order-stats
---

By now you've written the same three lines more than once: work out a line total, round it, add
it up. A **function** gives those lines a name, so you write them once and call them anywhere. It
is also the first tool for making code readable: `shipping_cost(order)` says what it does, and the
details live somewhere else.

## def, parameters and return

A function is defined with `def`, a name, its **parameters** in parentheses, and a colon. The
indented block under it is the **body**. `return` hands a value back to whoever called it.

```python
def line_total(quantity, unit_price):
    return quantity * unit_price

line_total(3, 4.5)
```

`quantity` and `unit_price` are parameters: names that exist only inside the function. When you
call `line_total(3, 4.5)`, Python binds `quantity` to `3` and `unit_price` to `4.5`, runs the body,
and the call expression becomes whatever `return` gave back. The values you pass in are called
**arguments**.

Because a call is an expression, you can use it anywhere a value fits:

```python
def line_total(quantity, unit_price):
    return quantity * unit_price

subtotal = line_total(3, 4.5) + line_total(1, 12.0)
f"Subtotal: {subtotal:.2f}"
```

> [!JS]
> Coming from JavaScript: `def` is a statement that runs when Python reaches it, so there is no
> hoisting. Calling a function on a line above its `def` raises `NameError`.

## No return means None

Every call returns something. If the body finishes without reaching a `return`, or reaches a bare
`return`, the call returns `None`.

```python
def greet(name):
    print(f"Hello, {name}")

result = greet("Ada")
result is None
```

That leads to the most common beginner bug with functions: **printing a value instead of returning
it**. The value appears on screen, so the function looks right, but the caller gets `None`:

```python raises
def shipping_cost(weight_kg):
    print(weight_kg * 1.5)       # shows the number, then returns None

total = 20 + shipping_cost(2)
```

`print()` is for people reading the screen. `return` is for the code that called you. A function
that calculates something should return it and let the caller decide whether to print it.

> [!WARNING]
> A function with a `return` in one branch but not another returns `None` from the other branch,
> silently. If a function sometimes gives you `None`, look for the path through it that has no
> `return`.

```quiz
question: 'What does `def label(n): "big" if n > 10 else "small"` return when called as `label(50)`?'
options:
  - "\"big\""
  - "\"small\""
  - "None"
answer: 2
explain: The body builds the string "big" and throws it away, because nothing returns it. With no return statement, the call returns None.
```

## Returning early and returning several values

`return` ends the function immediately, which makes it a clean way to handle special cases first.
This style is often called a **guard clause**: deal with the odd input at the top, and the rest of
the body can assume the normal case.

```python
def shipping_cost(weight_kg):
    if weight_kg <= 0:
        return 0.0
    if weight_kg <= 2:
        return 4.99
    return 4.99 + (weight_kg - 2) * 1.25

shipping_cost(0), shipping_cost(1.5), shipping_cost(6)
```

No `else` is needed after a `return`: if the first `if` returned, the later lines never run.

To give back more than one value, return a tuple. The caller usually unpacks it straight away, the
way you unpacked tuples in the last module:

```python
def split_name(full_name):
    first, _, last = full_name.partition(" ")
    return first, last

first, last = split_name("Grace Hopper")
last
```

`return first, last` builds the tuple `("Grace", "Hopper")`. There is only ever one return value;
it just happens to be a tuple.

## Calling a function vs naming it

The parentheses are what call a function. Without them you have the function **object** itself,
which is a value like any other (a later lesson makes good use of that). Forgetting them is a quiet
bug, because nothing fails until you try to use the result:

```python raises
def order_count():
    return 12

count = order_count          # no parentheses: count is the function, not 12
count + 1
```

The error message, `unsupported operand type(s) for +: 'function' and 'int'`, is the clue: a
function turned up where you expected its result.

## Docstrings

A string literal as the **first statement** of a function is its **docstring**. It documents what
the function does, what it takes and what it returns, and Python keeps it on the function as
`__doc__`, which is what `help()` and your editor's tooltips show.

```python
def line_total(quantity, unit_price):
    """Return the price of one invoice line, rounded to cents.

    quantity is a whole number of units; unit_price is the price of one unit.
    """
    return round(quantity * unit_price, 2)

print(line_total.__doc__)
```

The conventions (from PEP 257) are simple:

- Use triple double quotes, even for one line.
- The first line is a one-sentence summary that ends with a full stop, written as a command:
  "Return the total", not "This function returns the total".
- If there's more to say, leave a blank line after the summary, then explain the arguments, the
  return value and anything surprising, such as what happens with an empty list.

A docstring says **what** and **why**. Comments inside the body are for the occasional **how** that
the code can't make obvious on its own.

> [!TIP]
> You'll often see functions written with type hints, like `def line_total(quantity: int, unit_price:
> float) -> float:`. They document the types and let tools check them, but Python doesn't enforce
> them at run time. Module 9 covers them properly; for now, the docstring carries that information.

```quiz
question: "Which of these is the docstring of `def refund(order): ...`?"
options:
  - "A # comment on the line above the def"
  - "The first string literal inside the body"
  - "Any string literal anywhere in the body"
answer: 1
explain: Only a string that is the very first statement of the body becomes `__doc__`. A string further down is just an expression that does nothing, and a comment is thrown away when the code is read.
```

## Where this leaves you

You can define a function, return a value (or several, as a tuple), stop early with `return`, and
document it with a docstring. You also know the two quiet bugs: printing instead of returning, and
forgetting the parentheses. The drills practise both. Next, parameters: the many ways to pass
arguments in, and the one default value that remembers every call.
