import contextlib
import io
import logging
import os
import re
import tempfile

from plp import test, hidden
from solution import configure
from invoicer import billing

LOG_FILE = "invoicer.log"


def tidy():
    """Close every handler (so invoicer.log isn't held open) and delete the log file."""
    loggers = [logging.getLogger()]
    loggers += [item for item in logging.Logger.manager.loggerDict.values() if isinstance(item, logging.Logger)]
    for logger in loggers:
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
            handler.close()
    with contextlib.suppress(OSError):
        os.remove(LOG_FILE)


@contextlib.contextmanager
def configured(*args, **kwargs):
    """Run the learner's configure() and yield what reaches the console."""
    tidy()
    console = io.StringIO()
    try:
        with contextlib.redirect_stdout(console):  # ext://sys.stdout is looked up while configuring
            configure(*args, **kwargs)
        yield console
    finally:
        tidy()


def log_file():
    for handler in logging.getLogger().handlers:
        handler.flush()
    if not os.path.exists(LOG_FILE):
        return None
    with open(LOG_FILE, encoding="utf-8") as fh:
        return fh.read()


def expect_console(console, wanted, why=""):
    got = console.getvalue()
    assert got == wanted, f"The console showed {got!r}; it should show {wanted!r}. {why}".strip()


@test("configure applies logging.toml: INFO and up on the console")
def _():
    with configured() as console:
        sync = logging.getLogger("invoicer.sync")
        sync.info("fetched 3 invoices")
        sync.debug("page 2 of 2")
        expect_console(console, "INFO invoicer.sync: fetched 3 invoices\n")


@test("billing.py's messages come through, though its logger was made before configure")
def _():
    with configured() as console:
        billing.charge("INV-1042", 1950)
        expect_console(
            console,
            "INFO invoicer.billing: charged INV-1042 for 1950p\n",
            "dictConfig switches off loggers that already exist unless the config says "
            "disable_existing_loggers = false.",
        )


@test("invoicer.log keeps DEBUG messages too, with the time")
def _():
    with configured():
        billing.charge("INV-1042", 1950)
        text = log_file()
        assert text is not None, "Nothing created invoicer.log. Add a logging.FileHandler with filename = \"invoicer.log\"."
        lines = text.splitlines()
        stamp = r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d{3}"
        wanted = [
            rf"{stamp} DEBUG invoicer\.billing: charging INV-1042 for 1950p",
            rf"{stamp} INFO invoicer\.billing: charged INV-1042 for 1950p",
        ]
        assert len(lines) == 2 and all(re.fullmatch(p, line) for p, line in zip(wanted, lines)), (
            "invoicer.log should hold both of billing's lines, DEBUG included, like\n"
            "2026-10-01 09:30:00,123 DEBUG invoicer.billing: charging INV-1042 for 1950p\n"
            f"but it holds:\n{text or '(nothing)'}"
        )


@test("httpx only gets through at WARNING, on both handlers")
def _():
    with configured(verbose=True) as console:
        httpx = logging.getLogger("httpx")
        httpx.info("HTTP Request: POST https://api.example.com/charges")
        httpx.debug("connection kept alive")
        httpx.warning("Retrying after a timeout")
        expect_console(console, "WARNING httpx: Retrying after a timeout\n")
        text = log_file() or ""
        assert "HTTP Request" not in text and "kept alive" not in text, "httpx's INFO and DEBUG lines reached invoicer.log"
        assert "WARNING httpx: Retrying after a timeout" in text, "httpx's warning should reach invoicer.log"


@test("verbose=True shows DEBUG on the console")
def _():
    with configured(verbose=True) as console:
        billing.charge("INV-1043", 0)
        expect_console(
            console,
            "DEBUG invoicer.billing: charging INV-1043 for 0p\n"
            "WARNING invoicer.billing: refused INV-1043: the amount must be positive\n",
        )


@hidden("verbose changes the loaded settings, not logging.toml")
def _():
    with open("logging.toml", encoding="utf-8") as fh:
        before = fh.read()
    with configured(verbose=True):
        pass
    with open("logging.toml", encoding="utf-8") as fh:
        assert fh.read() == before, "configure(verbose=True) rewrote logging.toml; change the dict you loaded instead"


@hidden("configure reads the file it's given")
def _():
    other = (
        'version = 1\ndisable_existing_loggers = false\n[formatters.bare]\nformat = "%(message)s"\n'
        '[handlers.console]\nclass = "logging.StreamHandler"\nstream = "ext://sys.stdout"\nformatter = "bare"\n'
        '[root]\nlevel = "INFO"\nhandlers = ["console"]\n'
    )
    folder = tempfile.mkdtemp()
    path = os.path.join(folder, "quiet.toml")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(other)
    with configured(path) as console:
        billing.charge("INV-7", 500)
        expect_console(console, "charged INV-7 for 500p\n", "configure(path) should apply the file at path, not a fixed config.")


@hidden("Configuring twice doesn't print every line twice")
def _():
    with configured() as console:
        with contextlib.redirect_stdout(console):
            configure()
        logging.getLogger("invoicer").error("payment provider unreachable")
        expect_console(console, "ERROR invoicer: payment provider unreachable\n")
