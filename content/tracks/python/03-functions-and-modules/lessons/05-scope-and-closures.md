---
slug: scope-and-closures
title: Scope and closures
summary: How Python finds a name (LEGB), why assigning inside a function makes a name local, and what a closure really remembers.
minutes: 40
exercises:
  - scope-predict-legb
  - closure-counter-fix
  - closure-make-formatter
  - closure-predict-late-binding
  - closure-running-average
---

Two functions, one name, and no clash:

```python
discount = 10

def checkout(total):
    discount = 25
    return total - discount

checkout(100), discount
```

The `discount` inside `checkout` is a different variable from the one outside, so the outer one is
still `10`. This lesson explains the rules behind that, which also explain two famous bugs and one
of Python's most useful tools, the closure.

## Local names

Every call to a function gets a fresh **local namespace**: a private set of names that exists while
the call runs and disappears when it returns. Parameters are local, and so is **any name the
function assigns to**.

```python raises
def add_vat(net):
    rate = 0.2
    return net * (1 + rate)

add_vat(50)
rate          # only existed inside the call
```

That's what keeps functions independent. `checkout` can use any names it likes without worrying
about the names in the rest of the program.

## LEGB: how Python finds a name

When code **reads** a name, Python looks in four places, in this order, and uses the first match:

1. **Local**: the current function's own names.
2. **Enclosing**: the names of any function this one is defined inside.
3. **Global**: the names at the top level of the module (the file).
4. **Built-in**: Python's own names, such as `len`, `print` and `sum`.

```python
currency = "GBP"                        # global

def make_invoice(amount):
    prefix = "INV"                      # local to make_invoice, enclosing for describe

    def describe():
        return f"{prefix}: {amount} {currency}, {len(prefix)} letter prefix"

    return describe()

make_invoice(120)
```

Inside `describe`, `prefix` and `amount` come from the enclosing function, `currency` is global and
`len` is built in. Because the built-ins come last, a global with the same name hides them, which is
why you should never name a variable `sum`, `list` or `max`:

```python raises
sum = 0
for price in [4.5, 12.0]:
    sum += price

sum([1, 2, 3])
```

> [!JS]
> Coming from JavaScript: only functions (and modules and classes) create a scope. An `if` block or a
> `for` loop does not, so a loop variable is still there after the loop ends, like `var` rather than
> `let`.

## Assigning makes a name local

Python decides which names are local **before the function runs**, by scanning the whole body for
assignments. If a name is assigned anywhere in the function, it is local **everywhere** in the
function, even on the lines before the assignment. That's the reason this fails:

```python raises
orders_today = 0

def record_order():
    orders_today += 1        # reads orders_today, then assigns it
    return orders_today

record_order()
```

`orders_today += 1` assigns to `orders_today`, so it is local to `record_order`. Reading it on the
same line happens before any local value exists, and Python raises `UnboundLocalError` rather than
quietly using the global. Without the assignment, reading the global would have worked fine.

## global, and why to avoid it

`global name` tells Python that assignments to `name` in this function should rebind the
module-level variable:

```python
orders_today = 0

def record_order():
    global orders_today
    orders_today += 1
    return orders_today

record_order(), record_order()
```

It works, but it's rarely the right answer. The function now has a hidden input and a hidden
output: its result depends on every earlier call anywhere in the program, it can't be tested on its
own, and two parts of the program that both count orders will interfere with each other. Pass the
value in and return the new one instead, or keep the state in a closure (next) or an object
(module 5).

```python
def record_order(count):
    return count + 1

orders_today = record_order(0)
orders_today = record_order(orders_today)
orders_today
```

## Closures

A function defined inside another function can use the enclosing function's variables, and it
keeps them **after the outer function has returned**. That combination, a function plus the
variables it remembers, is a **closure**.

```python
def make_discount(percent):
    def apply(price):
        return round(price * (1 - percent / 100), 2)
    return apply

staff_price = make_discount(20)
sale_price = make_discount(50)

staff_price(80.0), sale_price(80.0)
```

Each call to `make_discount` creates a new local `percent` and a new `apply` function that refers
to it. `staff_price` and `sale_price` are two different closures, each remembering its own `percent`.

What a closure captures is the **variable**, not the value it had at the time. Python stores it in a
"cell" that the inner and outer functions share, so if the outer function changes the variable
later, the closure sees the new value:

```python
def make_report():
    title = "Draft"
    def show():
        return f"Report: {title}"
    title = "Final"          # changed after show was defined
    return show

make_report()()
```

## nonlocal: changing an enclosing variable

Reading an enclosing variable just works. **Assigning** to it hits the rule from before: the
assignment makes the name local to the inner function. `nonlocal name` says "this name belongs to
the enclosing function", so the inner function can rebind it:

```python
def make_counter():
    count = 0
    def next_ticket():
        nonlocal count
        count += 1
        return f"T-{count:03d}"
    return next_ticket

desk_a = make_counter()
desk_b = make_counter()
desk_a(), desk_a(), desk_b()
```

Each counter keeps its own `count`, and nothing outside can change it. That's the private state a
`global` can't give you.

```quiz
question: "Inside `next_ticket`, what happens if you remove the line `nonlocal count`?"
options:
  - "It uses a new count starting at 0 every call"
  - "It raises UnboundLocalError"
  - "It changes a global count instead"
answer: 1
explain: "count += 1 assigns to count, which makes count local to next_ticket. Reading it before it has a local value raises UnboundLocalError, the same bug as record_order."
```

## The late-binding trap

Because closures capture variables, not values, functions created in a loop can surprise you. Here
are three price rules, built in a loop:

```python
rules = []
for rate in [0.1, 0.2, 0.3]:
    rules.append(lambda price: round(price * (1 - rate), 2))

[rule(100) for rule in rules]
```

Every rule gives `70.0`. The three lambdas all refer to the **same** variable `rate` (the loop
doesn't create a new scope), and by the time any of them runs, the loop has finished and `rate` is
`0.3`. The variable is looked up when the function is **called**, not when it's created. That's
called **late binding**.

The fix uses a rule from lesson 2: default values are evaluated **when the function is defined**.
Pass the current value in as a default, and each lambda stores its own copy:

```python
rules = []
for rate in [0.1, 0.2, 0.3]:
    rules.append(lambda price, rate=rate: round(price * (1 - rate), 2))

[rule(100) for rule in rules]
```

A factory like `make_discount` is the other clean fix, because each call to it creates a new
variable for its closure to capture.

## Where this leaves you

Python finds a name by looking in the local, enclosing, global and built-in scopes, in that order.
Assigning to a name anywhere in a function makes it local there, unless you declare it `nonlocal`
(or, reluctantly, `global`). A closure is a function that remembers the variables around it; it
remembers the variables themselves, which is why loops need the default-argument trick. The drills
start with predicting lookups and end with a closure that keeps a running average.
