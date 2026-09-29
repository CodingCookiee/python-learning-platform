---
slug: handling-exceptions
title: Handling exceptions
summary: What try, except, else and finally each guarantee, how Python picks the except clause, and why catching everything is a bug.
minutes: 40
exercises:
  - errors-amount-or-none
  - errors-predict-finally
  - errors-fix-swallowed
  - errors-finally-unlock
  - errors-import-report
---

A nightly job imports 4,000 payments from a bank file. Row 2,817 has `"n/a"` where an amount
should be. You don't want that one row to kill the other 3,999, and you don't want a bug in your
own code quietly treated as "bad row" either. Module 4 introduced the idea: try the operation and
catch the one failure you expect. This lesson covers the whole `try` statement and exactly what
each part guarantees.

## What raising does

When something goes wrong, Python creates an **exception object** and **raises** it. Normal
execution stops at that line. Python then leaves the current function, and the one that called it,
and so on up the call stack, until it finds a `try` statement with an `except` clause that matches.
If nothing matches, the program stops and prints a **traceback**: the chain of calls it unwound,
oldest first, and the exception's type and message at the bottom.

```python raises
def parse_amount(text):
    return float(text)


def import_row(row):
    return {"id": row["id"], "amount": parse_amount(row["amount"])}


import_row({"id": "P-2817", "amount": "n/a"})
```

Read it from the bottom up: a `ValueError` from `float()`, raised in `parse_amount`, called from
`import_row`, called from line 9. Neither function tried to handle it, so the exception travelled
all the way out.

An exception is an ordinary object. `except ... as error` binds it to a name, and its `args` hold
what it was created with:

```python
try:
    float("n/a")
except ValueError as error:
    caught = error

type(caught), caught.args, str(caught)
```

> [!JS]
> Coming from JavaScript: `try`/`except`/`finally` is `try`/`catch`/`finally`. The difference is
> that `except` names the type it handles, so you never write `if (e instanceof ...)` and rethrow.

## Four clauses, four jobs

A full `try` statement has up to four parts:

| Clause | Runs when | Use it for |
|--------|-----------|------------|
| `try` | always, first | only the code that can fail in a way you expect |
| `except SomeError` | the `try` block raised a matching exception | recovering from that failure |
| `else` | the `try` block finished without raising | what should happen only on success |
| `finally` | always, last, whatever happened | cleanup that must happen no matter what |

```python
def charge(amount):
    try:
        if amount <= 0:
            raise ValueError(f"can't charge {amount}")
        print("gateway approved", amount)
    except ValueError as error:
        print("refused:", error)
    else:
        print("receipt emailed")
    finally:
        print("session closed")


charge(25)
print("---")
charge(-5)
```

Why have `else` at all, when you could put the receipt line at the end of the `try` block? Because
then a bug in the receipt code that raised `ValueError` would be reported as "refused". Code in
`else` runs on success, but its errors aren't caught by the `except` clauses above it.

## How Python picks an except clause

A `try` can have several `except` clauses. Python checks them **top to bottom** and runs the first
one whose type matches, using the same test as `isinstance`: a clause for a class also catches all
of its subclasses. A tuple catches any of several types.

The built-in exceptions form a class hierarchy, and knowing its shape tells you what a clause will
catch:

```text
BaseException
 ├── KeyboardInterrupt, SystemExit      (not errors: Ctrl+C, sys.exit())
 └── Exception                          (every error you'd want to handle)
      ├── ArithmeticError
      │    └── ZeroDivisionError, decimal.InvalidOperation, ...
      ├── LookupError
      │    └── KeyError, IndexError
      ├── OSError
      │    └── FileNotFoundError, PermissionError, ConnectionError, ...
      ├── ValueError
      │    └── json.JSONDecodeError, UnicodeDecodeError, ...
      └── TypeError, AttributeError, NameError, ...
```

```python
def unit_price(order, line):
    try:
        item = order["lines"][line]
        return item["total"] / item["qty"]
    except ZeroDivisionError:
        return 0.0
    except (KeyError, IndexError) as error:
        return f"no such line or field: {error!r}"


order = {"lines": [{"total": 12.0, "qty": 3}, {"total": 5.0, "qty": 0}]}
unit_price(order, 0), unit_price(order, 1), unit_price(order, 7)
```

Because the check is `isinstance`, order matters. Put the specific clause first: an
`except LookupError` above `except KeyError` would catch every `KeyError`, and the second clause
would never run.

> [!NOTE]
> Python 3.14 also accepts `except KeyError, IndexError:` without the brackets, as long as there's
> no `as`. The bracketed form works in every version, so this course uses it.

```quiz
question: "A try block raises KeyError. The clauses are `except LookupError:` then `except KeyError:`. Which one runs?"
options:
  - "except LookupError, because KeyError is a subclass of LookupError and it comes first"
  - "except KeyError, because it's the more specific match"
  - Both, one after the other
answer: 0
explain: Python runs the first clause that matches, checking top to bottom with isinstance. It doesn't look for the best match, so the KeyError clause here is dead code.
```

## What finally guarantees

`finally` runs whether the `try` block finished, raised, or left early with `return`, `break` or
`continue`. That's the guarantee cleanup code needs: a lock released, a temporary file removed, a
connection closed.

```python
def post_batch(ledger, amounts):
    ledger["locked"] = True
    try:
        for amount in amounts:
            if amount == 0:
                return "stopped at a zero amount"
            ledger["entries"].append(amount)
        return "posted"
    finally:
        ledger["locked"] = False       # runs on both returns


ledger = {"locked": False, "entries": []}
post_batch(ledger, [120, 0, 45]), ledger
```

When an exception is on its way out, `finally` runs and then the exception carries on to the
caller. Note that the lock was taken *before* the `try`: if taking the lock itself fails, there's
nothing to release, so it mustn't be inside the block that `finally` cleans up after.

```python raises
def post_batch(ledger, amounts):
    ledger["locked"] = True
    try:
        for amount in amounts:
            ledger["entries"].append(100 / amount)
    finally:
        ledger["locked"] = False
        print("unlocked:", ledger)


post_batch({"locked": False, "entries": []}, [4, 0])
```

The traceback shows the `ZeroDivisionError`, and the printed line shows the ledger was unlocked
first.

> [!WARNING]
> Never `return` from a `finally` block. A `return` there replaces whatever was happening,
> including an exception on its way out, so the error silently disappears. Python 3.14 warns about
> it (a `SyntaxWarning`) for exactly that reason.

One subtlety of `else`: it runs only when the `try` block *falls off its end*. If the `try` block
returns, `else` is skipped, though `finally` still runs.

## Catching everything is a bug

Here is the wrong way first. It looks careful:

```python
def total_paid(rows):
    total = 0.0
    for row in rows:
        try:
            total += float(row["amuont"])    # typo
        except:
            pass
    return total


total_paid([{"amount": "12.50"}, {"amount": "n/a"}, {"amount": "7.25"}])
```

Every row raised `KeyError` because of the typo, and the bare `except:` treated each one as "bad
row, skip it". The function returns `0.0`, the report says nobody paid, and there's no error
anywhere to lead you to the typo. `except Exception: pass` does exactly the same.

A bare `except:` is worse still: it catches `BaseException`, which includes `KeyboardInterrupt`
(the user pressing Ctrl+C) and `SystemExit` (the program asking to stop):

```python
import sys

def shut_down():
    try:
        sys.exit("shutting down for maintenance")
    except:
        print("carrying on regardless")
    return "still running"


shut_down()
```

The fix is always the same: catch the exception you expect, from the smallest block that can raise
it, and let everything else through.

```python
def total_paid(rows):
    total = 0.0
    for row in rows:
        try:
            amount = float(row["amount"])
        except ValueError:
            continue                  # "n/a" and friends: skip the row
        total += amount
    return total


total_paid([{"amount": "12.50"}, {"amount": "n/a"}, {"amount": "7.25"}])
```

Now a typo in the key raises `KeyError` straight away, with a traceback pointing at the line.

> [!TIP]
> There is one good place for `except Exception`: the top of a loop that must survive any one bad
> item, such as a job that processes a queue. Even there, never `pass`: record what failed and why
> (the logging lesson at the end of this module shows how), so the failure is visible.

## Handle it where you can do something about it

A function should catch an exception only if it can do something useful: retry, use a default,
skip a row, or turn it into a better message. If it can't, it should let the exception go past.
Low-level code that swallows errors robs the caller of the choice.

```python
def parse_amount(text):
    return float(text)           # can't know what the caller wants: let it raise


def import_rows(rows):
    imported, skipped = [], []
    for number, row in enumerate(rows, start=1):
        try:
            amount = parse_amount(row["amount"])
        except ValueError:
            skipped.append(number)          # this level knows: skip and report
        else:
            imported.append(amount)
    return imported, skipped


import_rows([{"amount": "12.50"}, {"amount": "n/a"}, {"amount": "7"}])
```

## Where this leaves you

Put only the risky line in `try`. Name the exceptions you expect, specific ones first. Use `else`
for success-only code and `finally` for cleanup that must always run, and acquire the resource
before the `try`. Never write a bare `except:` or `except Exception: pass`. The drills practise
each clause, and one of them is a bug hunt through exactly that kind of silent `except`.
