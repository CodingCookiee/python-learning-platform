---
slug: functions-as-values
title: Functions as values
summary: Pass functions to sorted(), min() and max(), write short ones with lambda, and choose between map/filter and a comprehension.
minutes: 35
exercises:
  - key-cheapest-first
  - key-predict-stable-sort
  - key-leaderboard
  - functions-map-filter-refactor
  - functions-dispatch-calculator
---

You have a list of orders and you want them sorted by total. `sorted()` can't guess what "by total"
means for a dict:

```python raises
orders = [{"id": 1042, "total": 89.5}, {"id": 1043, "total": 12.0}]
sorted(orders)
```

The fix is to hand `sorted()` a small function that says what to compare. That works because in
Python a function is a value, like a number or a list, and this lesson is about what that makes
possible.

## Functions are objects

`def` creates a function object and binds it to a name, the same way `=` binds a name to a list. So
you can bind a second name to it, put it in a list, or pass it to another function. Leave the
parentheses off and you're talking about the function; add them and you're calling it.

```python
def with_vat(net):
    return round(net * 1.2, 2)

add_tax = with_vat               # a second name for the same function
steps = [with_vat, round, str]

add_tax(10), steps[0](10), with_vat.__name__
```

A function that takes another function as an argument is sometimes called a **higher-order
function**. You've already used one: `sorted()`.

## sorted() with key

`sorted(items, key=some_function)` calls `some_function` once on every item and sorts the items by
the results. The items themselves come back unchanged, just in a new order.

```python
def order_total(order):
    return order["total"]

orders = [
    {"id": 1042, "total": 89.5},
    {"id": 1043, "total": 12.0},
    {"id": 1044, "total": 45.25},
]
[order["id"] for order in sorted(orders, key=order_total)]
```

Note `key=order_total`, with no parentheses: you're passing the function for `sorted()` to call,
not calling it yourself. Built-in functions and methods work as keys too:

```python
words = ["Banana", "apple", "cherry", "kiwi"]
sorted(words), sorted(words, key=str.lower), sorted(words, key=len, reverse=True)
```

Plain `sorted(words)` puts `"Banana"` first because capital letters sort before lower-case ones.
`key=str.lower` compares the lower-case forms instead.

To break ties, return a **tuple**: tuples compare item by item, so `(department, name)` sorts by
department, then by name within each department. To sort one part in reverse, negate a number:

```python
staff = [("ops", "Mo", 3), ("dev", "Kim", 5), ("ops", "Ada", 5), ("dev", "Sam", 2)]

def by_years_then_name(person):
    team, name, years = person
    return (-years, name)        # most years first, then A to Z

sorted(staff, key=by_years_then_name)
```

> [!NOTE]
> Python's sort is **stable**: items whose keys are equal keep their original order. `list.sort()`
> takes the same `key` and `reverse` arguments and sorts the list in place, returning `None`.

## lambda: a function in one expression

Writing a whole `def` for `return order["total"]` is heavy. `lambda` makes a small function inline:

```python
orders = [
    {"id": 1042, "total": 89.5},
    {"id": 1043, "total": 12.0},
    {"id": 1044, "total": 45.25},
]
sorted(orders, key=lambda order: order["total"])[0]
```

`lambda order: order["total"]` means the same as a `def` with one parameter `order` that returns
`order["total"]`. The body is **a single expression**, and its value is returned automatically.
There are no statements in a lambda: no `if` blocks, loops, assignments or `return`.

Use a lambda for short, throwaway functions passed straight into a call. If you find yourself
writing `total_of = lambda order: ...`, write a `def` instead: it gets a real name in error
messages and room for a docstring.

> [!JS]
> Coming from JavaScript: a lambda is like an arrow function with an expression body,
> `order => order.total`. There's no block form, so anything longer than one expression needs a `def`.

## min() and max() with key

`min()` and `max()` take the same `key` argument. They return the **item** that scored lowest or
highest, not the score itself, which is usually exactly what you want:

```python
orders = [
    {"id": 1042, "customer": "ada", "total": 89.5},
    {"id": 1043, "customer": "grace", "total": 12.0},
    {"id": 1044, "customer": "linus", "total": 45.25},
]
biggest = max(orders, key=lambda order: order["total"])
biggest["customer"]
```

On an empty list they raise `ValueError`. Pass `default=` to get a value back instead:

```python
todays_orders = []
max(todays_orders, key=len, default="no orders yet")
```

```quiz
question: "What does `min([\"pear\", \"fig\", \"banana\"], key=len)` return?"
options:
  - "3"
  - "\"fig\""
  - "\"banana\""
answer: 1
explain: "key=len means the items are compared by length, but min returns the item itself, not its length. \"fig\" is the shortest."
```

## map() and filter() vs comprehensions

`map(function, items)` calls the function on every item. `filter(function, items)` keeps the items
for which the function returns something truthy. Both return a lazy **iterator**, so wrap them in
`list()` to see the results:

```python
prices = [12.5, 3.0, 48.0, 7.25]
list(map(lambda price: round(price * 1.2, 2), prices)), list(filter(lambda price: price > 10, prices))
```

You already know another way to write both:

```python
prices = [12.5, 3.0, 48.0, 7.25]
[round(price * 1.2, 2) for price in prices], [price for price in prices if price > 10]
```

Most Python developers prefer the comprehension: it reads left to right, it needs no lambda, and it
does mapping and filtering in one expression. `map` is still nice when the function already exists
and has a name:

```python
lines = ["  ada  ", "grace ", " linus"]
list(map(str.strip, lines))
```

> [!TIP]
> A rule of thumb: if you'd need a `lambda` inside `map()` or `filter()`, write a comprehension
> instead.

## A table of functions

Because functions are values, a dict can map names to functions. Looking up the function and
calling it replaces a long `if`/`elif` chain, and adding a case is one new line:

```python
def to_upper(text):
    return text.upper()

def to_title(text):
    return text.title()

FORMATTERS = {"upper": to_upper, "title": to_title, "strip": str.strip}

def format_field(style, text):
    return FORMATTERS[style](text)

format_field("title", "ada lovelace"), format_field("strip", "  ok  ")
```

`FORMATTERS[style]` is a function, and the `(text)` after it calls that function. This pattern is
called a **dispatch table**, and you'll see it in command-line tools, parsers and web routers.

## Where this leaves you

Functions are values: you can name them, store them and pass them. `sorted()`, `min()` and `max()`
take a `key` function that says what to compare; `lambda` writes that function inline when it fits
in one expression. For transforming and filtering lists, a comprehension usually beats
`map`/`filter`. Next, what happens when a function is defined **inside** another function, and
remembers the variables around it.
