import io
import json
import logging
import logging.config
from datetime import datetime, timezone
from decimal import Decimal

from plp import test, hidden
from solution import JsonFormatter

WHEN = datetime(2026, 9, 29, 14, 5, 0, 500000, tzinfo=timezone.utc).timestamp()


def capture(formatter):
    """A fresh logger that writes through the formatter to a StringIO."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(formatter)
    logger = logging.getLogger("invoicer.billing")
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    logger.disabled = False
    return logger, stream


def entries(stream):
    return [json.loads(line) for line in stream.getvalue().splitlines()]


@test("Formats a warning with extra fields")
def _():
    record = logging.makeLogRecord(
        {
            "name": "invoicer.billing",
            "levelno": logging.WARNING,
            "levelname": "WARNING",
            "msg": "Card declined for %s",
            "args": ("INV-1042",),
            "created": WHEN,
            "order_id": "A-17",
            "amount": Decimal("25.50"),
        }
    )
    assert json.loads(JsonFormatter().format(record)) == {
        "time": "2026-09-29T14:05:00.500Z",
        "level": "WARNING",
        "logger": "invoicer.billing",
        "message": "Card declined for INV-1042",
        "order_id": "A-17",
        "amount": "25.50",
    }


@test("Works through a real logger, with extra=")
def _():
    logger, stream = capture(JsonFormatter())
    logger.info("Charging %s for %.2f", "INV-1043", 12.5, extra={"customer": "ada@example.com"})
    [entry] = entries(stream)
    assert {key: entry[key] for key in ("level", "logger", "message", "customer")} == {
        "level": "INFO",
        "logger": "invoicer.billing",
        "message": "Charging INV-1043 for 12.50",
        "customer": "ada@example.com",
    }


@test("A plain record has only the four keys")
def _():
    logger, stream = capture(JsonFormatter())
    logger.error("Payment provider unreachable")
    [entry] = entries(stream)
    assert sorted(entry) == ["level", "logger", "message", "time"]


@test("Includes the traceback for logger.exception")
def _():
    logger, stream = capture(JsonFormatter())
    try:
        1 / 0
    except ZeroDivisionError:
        logger.exception("Could not split INV-1044")
    assert len(stream.getvalue().splitlines()) == 1, "Each record should be exactly one line"
    [entry] = entries(stream)
    assert entry["message"] == "Could not split INV-1044"
    assert "Traceback" in entry.get("exception", ""), "The exception key should hold the formatted traceback"
    assert "ZeroDivisionError" in entry["exception"]


@hidden("Writes the time in UTC with a Z")
def _():
    record = logging.makeLogRecord({"name": "invoicer", "msg": "Started", "created": WHEN + 3600.25})
    assert json.loads(JsonFormatter().format(record))["time"] == "2026-09-29T15:05:00.750Z"


@hidden("Works when named in a dictConfig")
def _():
    stream = io.StringIO()
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {"json": {"()": JsonFormatter}},
            "handlers": {"collector": {"class": "logging.StreamHandler", "stream": stream, "formatter": "json"}},
            "loggers": {"invoicer.sync": {"handlers": ["collector"], "level": "INFO", "propagate": False}},
        }
    )
    logging.getLogger("invoicer.sync").info("Synced %d invoices", 3, extra={"batch": 7})
    logging.getLogger("invoicer.sync").handlers.clear()
    [entry] = entries(stream)
    assert (entry["message"], entry["batch"]) == ("Synced 3 invoices", 7)
