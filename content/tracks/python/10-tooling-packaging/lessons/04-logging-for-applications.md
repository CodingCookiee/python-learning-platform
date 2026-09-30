---
slug: logging-for-applications
title: Logging for applications
summary: The logger tree, handlers and formatters, dictConfig, and the rule that libraries log while applications configure.
minutes: 40
exercises:
  - logconf-formatter
  - logconf-predict-propagation
  - logconf-dict-config
  - logconf-library-logging
  - logconf-json-formatter
lab:
  title: A console and a log file
  kind: output
  instructions: >-
    With the file handler from step 3 in place, run uv run main.py and paste the last lines of
    invoicer.log (on Windows PowerShell, Get-Content invoicer.log -Tail 20). The file should have
    timestamped DEBUG and INFO lines that the console didn't show.
  command: tail -n 20 invoicer.log
  patterns:
    - '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
    - '\bDEBUG\b'
    - '\bINFO\b'
---

`logging.basicConfig()` is fine for a script. An application needs more: quiet output on the console
but full detail in a file, `--verbose` for when something goes wrong, and the chatter from httpx
turned down to warnings. It also has to cope with every library it imports doing its own logging.
All of that is one piece of configuration, written once, in the application's entry point. This
lesson shows what goes in it, and why libraries must never write one.

## A quick recap

A **logger** is named, usually after the module that uses it. Each message has a **level**, and
anything below the configured level is dropped:

```python
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", stream=sys.stdout, force=True)

log = logging.getLogger("invoicer.billing")
log.debug("Card token tok_4242")      # below INFO: dropped
log.info("Charging INV-1042")
log.warning("Card declined for INV-1042")
```

In real modules the name is `logging.getLogger(__name__)`, so each module's logger is named after
it. The levels, lowest to highest, are `DEBUG`, `INFO`, `WARNING`, `ERROR` and `CRITICAL`. (`force=True`
replaces any earlier configuration, which only matters because this page reuses one Python for every
Run.)

## Loggers form a tree

Dots in a logger's name make a hierarchy. `invoicer.billing` is a child of `invoicer`, which is a
child of the **root** logger:

```python
import logging

app = logging.getLogger("invoicer")
billing = logging.getLogger("invoicer.billing")
billing.parent is app, app.parent.name
```

This tree is what makes configuration manageable. A record created by `invoicer.billing` is passed
to its own handlers, then **propagates** up to the handlers of `invoicer`, then of the root. And a
logger without a level of its own uses its nearest ancestor's. So you configure a few loggers near
the top (`invoicer`, `httpx`, the root) and every module underneath follows.

## Handlers and formatters

Three objects share the work:

- The **logger** decides whether a record is made at all (its level).
- Each **handler** decides where a record goes (console, file, email) and can have its own level.
- Each handler's **formatter** decides what the line looks like.

Here one logger feeds two handlers: a short console line for warnings and above, and a detailed
line for everything, written to a `StringIO` that stands in for a log file:

```python
import io
import logging
import sys

log = logging.getLogger("invoicer.sync")
log.handlers.clear()                 # start fresh on every Run
log.propagate = False                # keep this demo away from the root logger
log.setLevel(logging.DEBUG)

console = logging.StreamHandler(sys.stdout)
console.setLevel(logging.WARNING)
console.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))

logfile = io.StringIO()
detailed = logging.StreamHandler(logfile)
detailed.setFormatter(logging.Formatter("%(levelname)-7s %(name)s:%(funcName)s:%(lineno)d %(message)s"))

log.addHandler(console)
log.addHandler(detailed)

log.debug("Fetched 3 invoices")
log.warning("INV-1040 has no customer email")
print("--- log file ---")
print(logfile.getvalue(), end="")
```

A format string picks attributes of the record: `%(asctime)s` (the time, shaped by the formatter's
`datefmt`), `%(levelname)s`, `%(name)s`, `%(message)s`, `%(funcName)s`, `%(lineno)d`, and more.
`%(levelname)-7s` pads the level to seven characters so the columns line up.

## dictConfig: the whole setup in one place

Building handlers by hand gets long. `logging.config.dictConfig` takes the same setup as one dict,
which you can keep in a module, or load from a TOML or JSON file:

```python
import logging
import logging.config

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {"format": "%(levelname)-7s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "formatter": "console",
            "level": "INFO",
        },
    },
    "loggers": {
        "invoicer": {"level": "DEBUG"},
        "httpx": {"level": "WARNING"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}

logging.config.dictConfig(LOGGING)

logging.getLogger("invoicer.billing").info("Charging INV-1042")
logging.getLogger("invoicer.billing").debug("Card token tok_4242")      # the handler wants INFO
logging.getLogger("httpx").info("HTTP Request: POST https://api.example.com")  # httpx wants WARNING
logging.getLogger("httpx").warning("Retrying after a timeout")
```

Reading it from the top:

- `"version": 1` is required; it's the only version there is.
- `formatters` and `handlers` are named, so handlers can refer to formatters by name.
  `"ext://sys.stdout"` means "the object at `sys.stdout`", looked up when the config is applied.
- `loggers` sets levels for parts of the tree. `invoicer` lets everything through to the handlers;
  `httpx` is turned down to warnings.
- `root` is where the handlers are attached. Every logger propagates to it, so one console handler
  serves the whole application, libraries included.

A production app usually adds a file handler, for example
`{"class": "logging.handlers.RotatingFileHandler", "filename": "invoicer.log", "maxBytes": 1_000_000, "backupCount": 3, "formatter": "detailed"}`,
and lists it next to `"console"` in the root's handlers.

> [!WARNING]
> Leave out `"disable_existing_loggers": False` and it defaults to `True`: every logger that already
> exists when you call `dictConfig` is switched off. Modules create their loggers when they're
> imported, which is before `main()` runs, so their messages silently vanish. Always set it to
> `False`.

```python
import logging
import logging.config

log = logging.getLogger("shipping.labels")   # created at import time, like every module's logger

logging.config.dictConfig({
    "version": 1,
    "handlers": {"console": {"class": "logging.StreamHandler", "stream": "ext://sys.stdout"}},
    "root": {"handlers": ["console"], "level": "INFO"},
})
log.warning("Printer offline")   # nothing: the logger was disabled
print("disabled:", log.disabled)

logging.config.dictConfig({"version": 1, "disable_existing_loggers": False})   # switch them back on
```

## Libraries log, applications configure

A **library** (anything other people import, including your own packages) logs, and does nothing
else. It never calls `basicConfig`, never adds handlers, and never sets levels, because it can't know
where the application wants its output:

```python
import logging

logger = logging.getLogger(__name__)


def charge(invoice_number, amount):
    logger.info("Charging %s for %.2f", invoice_number, amount)
    ...
```

Passing values as arguments (`"Charging %s", invoice_number`) rather than an f-string means the text
is only built if a handler actually wants the record.

The **application** configures logging exactly once, at the start of `main()`. Here's what goes
wrong when a library breaks the rule: `basicConfig` does nothing if the root logger already has a
handler, so the library's call wins and the application's own setup is silently ignored.

```python
import logging
import sys

logging.root.handlers.clear()   # start clean for this demo

# Deep inside a library, at import time:
logging.basicConfig(level=logging.DEBUG, format="LIBRARY %(message)s", stream=sys.stdout)

# Later, in the application's main():
logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s", stream=sys.stdout)

logging.getLogger("invoicer").info("Shown, at a level the app never asked for, in the library's format")
```

> [!TIP]
> A library may add `logging.getLogger("yourlib").addHandler(logging.NullHandler())` in its
> `__init__.py`. It changes nothing when the application has configured logging, and keeps Python
> from printing the library's warnings with its last-resort format when it hasn't.

> [!JS]
> Coming from JavaScript: this is the difference between a package that calls `console.log` and
> one that uses `debug("mylib:http")`. The second lets the application decide what's shown.

## Choosing the level at run time

Applications usually let the user turn detail up or down with `-v` or `-q`, which the next lesson
wires into argparse. The mapping itself is a small function:

```python
import logging

def level_for(verbosity):
    """-q gives -1, nothing gives 0, -v gives 1, -vv gives 2."""
    levels = {-1: logging.ERROR, 0: logging.WARNING, 1: logging.INFO}
    return levels.get(verbosity, logging.DEBUG if verbosity > 1 else logging.ERROR)

[logging.getLevelName(level_for(v)) for v in (-2, -1, 0, 1, 2, 3)]
```

Pass the result into the dict before calling `dictConfig`, for example as the console handler's
`"level"`.

## Do it on your machine

1. In your `invoicer` project, add a module or two with `logger = logging.getLogger(__name__)` at
   the top of each, and a few `logger.info` and `logger.debug` calls.
2. Write a `LOGGING` dict like the one above, and call `logging.config.dictConfig(LOGGING)` first
   thing in `main()`. Run it with `uv run main.py`.
3. Add a `RotatingFileHandler` writing `invoicer.log` with a detailed formatter that includes
   `%(asctime)s`, at `DEBUG`. Check the console stays quiet while the file gets everything.
   Add `*.log` to `.gitignore`.
4. `uv add httpx`, make one request, and see httpx's own `INFO` lines. Then set the `httpx` logger to
   `WARNING` in your config and watch them disappear.
5. Remove `"disable_existing_loggers": False` and run again. Which messages vanished? Put it back.
6. **Check it:** run `uv run main.py` once more and paste the last lines of `invoicer.log`
   (`tail -n 20 invoicer.log`) into the lab box below.

## Where this leaves you

Loggers form a tree named after modules; records propagate up to handlers, which have formatters.
`dictConfig` sets all of it up in one place, with `disable_existing_loggers` set to `False`.
Libraries only ever call `getLogger(__name__)` and log; the application configures, once. The
drills build a formatter, predict propagation, write a config, fix a library that configures
logging itself, and finish with a JSON formatter for log collectors.
