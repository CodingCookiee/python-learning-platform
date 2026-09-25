---
slug: parameters-and-arguments
title: Parameters and arguments
summary: Positional and keyword arguments, default values, and why a list default remembers every call.
minutes: 35
exercises:
  - params-order-label
  - params-predict-default-once
  - params-mutable-default
  - params-group-orders
---

What does this call do?

```python norun
send_invoice("ada@example.com", 120, True, False)
```

You can't tell without opening the function. Python gives you ways to make calls like this readable,
and to make some arguments optional. One of those ways has a famous trap in it, and by the end of
this lesson you'll know exactly why it happens.

## Positional and keyword arguments

When you call a function, you can match arguments to parameters **by position** or **by name**. An
argument passed as `name=value` is a **keyword argument**, and its position no longer matters.

```python
def send_invoice(email, amount, reminder, copy_to_accounts):
    return f"{amount} to {email} (reminder={reminder}, copy={copy_to_accounts})"

send_invoice("ada@example.com", 120, reminder=True, copy_to_accounts=False)
```

The call now explains itself. You can mix the two styles, with one rule: **positional arguments
come first**. Once you've named one argument, every argument after it must be named too, because
Python could no longer tell which parameter a bare value was meant for.

```python raises
def send_invoice(email, amount, reminder, copy_to_accounts):
    return f"{amount} to {email}"

send_invoice(email="ada@example.com", 120, True, False)
```

Python checks the call against the parameters and complains clearly when they don't match: a
missing argument, one too many, or a keyword that isn't a parameter at all.

```python raises
def send_invoice(email, amount):
    return f"{amount} to {email}"

send_invoice("ada@example.com", ammount=120)
```

> [!TIP]
> Pass `True`, `False` and `None` by keyword. `export(rows, header=True)` reads well;
> `export(rows, True)` makes every reader look up what `True` means.

## Default values

A parameter with `= value` in the `def` has a **default**: the caller can leave it out.

```python
def format_price(amount, currency="GBP", decimals=2):
    return f"{amount:.{decimals}f} {currency}"

format_price(12.5), format_price(12.5, "EUR"), format_price(1200, decimals=0)
```

Parameters with defaults must come after the ones without, for the same reason as before: in
`format_price(12.5, "EUR")`, Python fills the parameters left to right, so a required parameter
after an optional one could never be reached by position. Writing `def f(currency="GBP", amount):`
is a `SyntaxError`.

## Defaults are evaluated once

Here is the mechanism that everything else in this lesson depends on. **A default value is worked
out once, when the `def` statement runs**, and that one object is stored on the function. Every
call that leaves the argument out gets that same stored object.

You can see the stored defaults on the function itself:

```python
tax_rate = 0.20

def price_with_tax(net, rate=tax_rate):
    return round(net * (1 + rate), 2)

tax_rate = 0.25                  # too late: the default was captured at def time
price_with_tax(100), price_with_tax.__defaults__
```

The default is `0.2` because that was the value of `tax_rate` when the `def` ran. Changing
`tax_rate` afterwards rebinds the name; it doesn't touch the object the function stored.

For numbers and strings this is harmless, since they can't be changed. For a list or a dict it is
a bug waiting to happen.

> [!JS]
> Coming from JavaScript: JS evaluates a default like `items = []` again on every call, so each call
> gets a fresh array. Python evaluates it once, and every call shares it.

## The mutable-default trap

Here is the wrong way first, because almost everyone writes it once. The idea is "start a new basket
unless I give you one":

```python
def add_to_basket(item, basket=[]):
    basket.append(item)
    return basket

first = add_to_basket("coffee beans")
second = add_to_basket("oat milk")     # a different shopper, a new basket... surely?
second
```

The second shopper got the first shopper's coffee. There was only ever **one** default list: it was
created when the `def` ran, stored in `add_to_basket.__defaults__`, and every call that left out
`basket` appended to that same object. `first` and `second` are two names for it:

```python
def add_to_basket(item, basket=[]):
    basket.append(item)
    return basket

first = add_to_basket("coffee beans")
second = add_to_basket("oat milk")
first is second, add_to_basket.__defaults__
```

This is the rebinding-versus-mutating idea from module 1 again. `append` mutates the shared object,
so every call sees every earlier call's changes. The bug hides in testing, too: the first call is
always right.

## The fix: None as a sentinel

Use `None` as the default, and create the new list **inside** the function, where it runs on every
call:

```python
def add_to_basket(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

add_to_basket("coffee beans"), add_to_basket("oat milk")
```

`None` is immutable, so sharing it is safe, and `basket = []` now builds a fresh list each time the
function runs. A caller can still pass their own list, and it is appended to as before.

Test with `is None` rather than truthiness. `basket = basket or []` looks shorter, but it also
replaces a list the caller passed in on purpose if that list happens to be empty, so their list
never receives the item:

```python
def add_to_basket(item, basket=None):
    basket = basket or []          # wrong for an empty list passed in
    basket.append(item)
    return basket

mine = []
add_to_basket("tea", mine)
mine
```

> [!WARNING]
> The same trap applies to any mutable default: `{}`, `set()`, or an object. If a default would ever
> be mutated, make it `None` and build the real value in the body.

```quiz
question: "`def log(event, history=[])` is called three times with no history argument. How many lists are created?"
options:
  - "Three, one per call"
  - "One, when the def runs"
  - "None until the first call"
answer: 1
explain: The default [] is evaluated once, when the def statement runs. All three calls append to that one list, which is why the history keeps growing.
```

## Where this leaves you

Positional arguments match by order and keyword arguments match by name; positional ones come
first. Defaults make parameters optional, and they are evaluated once, when the function is defined.
That's why a mutable default is shared by every call, and why the fix is `None` plus a new object
in the body. Next: functions that take any number of arguments, and parameters that can only be
passed one way.
