---
slug: logging-basics
title: Logging basics
summary: Give each module its own logger, pick the right level for each message, and record exceptions with their tracebacks instead of printing them.
minutes: 30
exercises:
  - logging-predict-levels
  - logging-discount-codes
  - logging-refactor-prints
  - logging-job-context
---

A nightly import skips 12 bad rows and finishes. Good: it didn't crash. But at 9 a.m. someone asks
why 12 customers are missing, and nobody can say. Choosing not to crash is only half the job; the
other half is leaving a record. `print()` is the wrong tool for it: its output is mixed in with the
program's real output, it has no idea how serious a message is, and you can't turn it down in
production or up while debugging. The `logging` module can do all three.

## A logger per module

Get a logger at the top of each module, named after the module:

```python norun
import logging

log = logging.getLogger(__name__)
```

`__name__` is the module's dotted import name, such as `shop.payments`. Loggers form a tree by
those names: `shop.payments` is a child of `shop`, which is a child of the **root** logger. A
message logged anywhere travels up the tree to the root, where the application has attached
**handlers** that decide where it goes: the terminal, a file, a log service.

Examples on this page call `logging.basicConfig(...)` first. It gives the root logger a handler, a
format and a level. `stream=sys.stdout` sends the messages to the output box below each example, and
`force=True` replaces the setup from any example you ran before, because every example on this page
runs in the same Python.

```python
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)

log = logging.getLogger(__name__)
log.info("importing payments from %s", "bank-2026-09-28.csv")
log.warning("row %d skipped: amount %r isn't a number", 17, "n/a")
print("__name__ here is", __name__)
```

The logger here is called `__main__`, because the code is running as a script. In a module
imported as `shop.payments`, the same line would say `shop.payments`, so every message says which
part of the program wrote it.

## Levels

Every message has a level, and each level has a job:

| Level | Method | For |
|-------|--------|-----|
| `DEBUG` (10) | `log.debug()` | detail you want only while diagnosing a problem |
| `INFO` (20) | `log.info()` | normal milestones: started, finished, imported 4,000 rows |
| `WARNING` (30) | `log.warning()` | something unexpected that the program handled: a skipped row, a retry |
| `ERROR` (40) | `log.error()` | an operation failed: a payment couldn't be taken |
| `CRITICAL` (50) | `log.critical()` | the program itself can't carry on |

A logger drops messages below its **level**. A logger with no level of its own uses its parent's,
and so on up to the root, whose level is `WARNING` unless it's configured. That's why an
unconfigured program shows warnings and errors but not its info messages.

```python
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s", force=True)

payments = logging.getLogger("shop.payments")
payments.setLevel(logging.DEBUG)      # turn up one noisy area while you debug it
refunds = logging.getLogger("shop.payments.refunds")
refunds.setLevel(logging.NOTSET)      # no level of its own: it inherits DEBUG from shop.payments
stock = logging.getLogger("shop.stock")
stock.setLevel(logging.NOTSET)        # inherits WARNING from the root

payments.debug("gateway responded in %d ms", 182)
refunds.debug("refund R-77 queued")
stock.info("stock count started")     # below WARNING: dropped
stock.warning("MUG-01 is below its reorder level")
```

```quiz
question: "A card is declined and the customer is asked to try another. The program handles it normally. Which level fits best?"
options:
  - DEBUG
  - INFO
  - ERROR
  - CRITICAL
answer: 1
explain: It's a normal event the program is built to handle, worth a record but not an alarm. ERROR is for an operation that failed and needs someone's attention, such as the gateway itself being unreachable.
```

## Let logging do the formatting

Pass the values as extra arguments, with `%s` (or `%d`, `%r`) placeholders in the message, rather
than building the text yourself with an f-string:

```python norun
log.debug("basket %s has %d lines", basket_id, len(lines))    # yes
log.debug(f"basket {basket_id} has {len(lines)} lines")      # works, but formats even when DEBUG is off
```

Logging formats the message only if it's actually going to be emitted, so a disabled debug message
costs almost nothing. And log services can group messages by the template,
`"basket %s has %d lines"`, however many different baskets there are. The finished text of a
message is available as `record.getMessage()`, which is what tests check.

## Logging exceptions

Inside an `except` block, `log.exception(message)` logs at `ERROR` level and attaches the
traceback of the exception being handled. It's how a program that carries on after a failure keeps
the evidence:

```python
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("shop.refunds")
log.setLevel(logging.NOTSET)


def send_refund(refund_id):
    if refund_id == "R-78":
        raise ConnectionError("gateway timed out")


for refund_id in ["R-77", "R-78", "R-79"]:
    try:
        send_refund(refund_id)
    except ConnectionError:
        log.exception("refund %s failed, will retry tonight", refund_id)
    else:
        log.info("refund %s sent", refund_id)
```

The failed refund is logged with its full traceback, and the loop carried on. Compare that with
`except ConnectionError: pass`: same behaviour, and no trace of it anywhere.

Log an exception **once**, where it's handled. If you catch it only to re-raise, don't log it as
well: the code that finally handles it will log it, and the same failure appearing three times in
the log makes it look like three failures. Where you need both, such as at the boundary of a job,
`log.exception(...)` followed by a bare `raise` is fine.

> [!WARNING]
> Call `log.exception()` only inside an `except` block. Anywhere else there's no exception being
> handled, and the log shows `NoneType: None` where the traceback should be. To attach a traceback
> at another level, pass `exc_info=True`, as in `log.warning("...", exc_info=True)`.

## Libraries log, applications configure

Only the entry point of a program, the `main()` that runs when you start it, should call
`logging.basicConfig()` or otherwise set up handlers. Every other module just calls
`logging.getLogger(__name__)` and logs. That way the person running the program decides where the
messages go and how many they see, and a module you import never takes over their terminal.

```python norun
# shop/payments.py: a module only logs
import logging

log = logging.getLogger(__name__)

def charge(card, amount):
    log.info("charging %s", amount)
    ...

# shop/main.py: the application configures, once, at startup
import logging

def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    ...
```

Configuring logs for real applications (log files, rotation, JSON output, different levels per
module) is part of module 10. Testing log output with pytest's `caplog` fixture is in module 7.

> [!JS]
> Coming from JavaScript: `console.debug`, `console.info`, `console.warn` and `console.error` give
> you levels, but not named loggers, a hierarchy, or a way to turn one module's messages up or down.
> That's closer to what libraries like `pino` or `winston` add.

## Where this leaves you

Give every module `log = logging.getLogger(__name__)`. Pick the level by what the message means,
from `debug` for diagnosis to `error` for failed operations. Pass values as arguments instead of
formatting them yourself. Use `log.exception()` inside `except` blocks so the traceback is
recorded, log each failure once, and leave configuration to the application's entry point.
