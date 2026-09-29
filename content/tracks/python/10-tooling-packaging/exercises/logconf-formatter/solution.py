import logging


def build_formatter():
    """A Formatter for lines like "2026-09-29 14:05:00 WARNING invoicer.billing: Card declined"."""
    return logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
