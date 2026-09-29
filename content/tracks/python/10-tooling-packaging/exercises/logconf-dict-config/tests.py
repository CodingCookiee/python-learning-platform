import io
import logging
import logging.config

from plp import test, hidden
from solution import logging_config


def reset_logging():
    """Undo whatever an earlier test or run configured."""
    loggers = [logging.getLogger()]
    loggers += [item for item in logging.Logger.manager.loggerDict.values() if isinstance(item, logging.Logger)]
    for logger in loggers:
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        logger.setLevel(logging.NOTSET)
        logger.propagate = True
        logger.disabled = False
    logging.getLogger().setLevel(logging.WARNING)


def configured(verbose=False):
    """Apply the learner's config, writing to a fresh StringIO, and return the stream."""
    reset_logging()
    stream = io.StringIO()
    config = logging_config(stream, verbose=verbose) if verbose else logging_config(stream)
    assert isinstance(config, dict), "logging_config() should return a dict"
    logging.config.dictConfig(config)
    return stream


@test("Writes INFO lines and drops DEBUG and httpx's INFO")
def _():
    stream = configured()
    logging.getLogger("invoicer.billing").info("Charging INV-1042")
    logging.getLogger("invoicer.billing").debug("Card token tok_4242")
    logging.getLogger("httpx").info("HTTP Request: POST https://api.example.com/charges")
    assert stream.getvalue() == "INFO invoicer.billing: Charging INV-1042\n"


@test("verbose=True lets DEBUG through")
def _():
    stream = configured(verbose=True)
    logging.getLogger("invoicer.sync").debug("Fetched 3 invoices")
    logging.getLogger("invoicer").warning("INV-1040 has no email")
    assert stream.getvalue() == "DEBUG invoicer.sync: Fetched 3 invoices\nWARNING invoicer: INV-1040 has no email\n"


@test("httpx and httpcore stay at WARNING, even when verbose")
def _():
    stream = configured(verbose=True)
    logging.getLogger("httpx").info("HTTP Request: GET https://api.example.com/invoices")
    logging.getLogger("httpcore.connection").debug("connect_tcp.started")
    logging.getLogger("httpx").warning("Retrying after a timeout")
    assert stream.getvalue() == "WARNING httpx: Retrying after a timeout\n"


@test("Loggers created before the config still work")
def _():
    reset_logging()
    early = logging.getLogger("invoicer.importer")   # created at import time, before main() runs
    stream = io.StringIO()
    logging.config.dictConfig(logging_config(stream))
    early.info("Imported 12 rows")
    assert stream.getvalue() == "INFO invoicer.importer: Imported 12 rows\n"


@hidden("Applying the config twice doesn't duplicate lines")
def _():
    reset_logging()
    stream = io.StringIO()
    logging.config.dictConfig(logging_config(stream))
    logging.config.dictConfig(logging_config(stream))
    logging.getLogger("invoicer").error("Payment provider unreachable")
    assert stream.getvalue() == "ERROR invoicer: Payment provider unreachable\n"
    reset_logging()
