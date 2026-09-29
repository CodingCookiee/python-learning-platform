"""Clean Harbour & Co's weekly marketplace order export.

Run it with:  python cleaner.py orders-raw.csv

Writes orders-raw-clean.csv (the good rows) and orders-raw-errors.csv (one line per problem)
next to the input, prints a summary, and exits with 0 (all clean), 1 (some rows rejected)
or 2 (the file couldn't be processed).
"""

import csv
import io
import logging
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

log = logging.getLogger(__name__)

REQUIRED = ["order_id", "date", "email", "sku", "qty", "unit_price", "status"]
CLEAN_COLUMNS = ["order_id", "order_date", "email", "sku", "quantity", "unit_price", "total", "status"]
ERROR_COLUMNS = ["line", "order_id", "field", "value", "problem"]
STATUSES = ("paid", "pending", "refunded")


# Exceptions: CleanerError, InputFileError(CleanerError) and FieldError(CleanerError, ValueError).
# FieldError(field, value, problem) stores all three, and its message is "<field> <problem>".


@dataclass
class Summary:
    """What main() reports once a file has been cleaned."""

    rows: int = 0          # rows read, not counting rows whose fields are all empty
    clean: int = 0         # rows written to the clean file
    rejected: int = 0      # rows written to the error report
    problems: int = 0      # lines in the error report


# One cleaner per field. Each takes the raw text, returns the clean value, or raises FieldError.


def clean_order_id(value):
    ...


def clean_date(value):
    ...


def clean_email(value):
    ...


def clean_sku(value):
    ...


def clean_quantity(value):
    ...


def clean_price(value):
    ...


def clean_status(value):
    ...


def clean_row(row):
    """The eight clean columns for one row (a dict keyed by the REQUIRED names), or an
    ExceptionGroup("invalid row", [...]) holding a FieldError for every problem in it."""
    ...


def clean_file(source, clean_path, errors_path):
    """Clean the export at source, write the clean rows and the error report, and return a
    Summary. Raises InputFileError if the file is missing or lacks a required column."""
    ...


def main(argv):
    """The command line. argv is the list of arguments after the program name.
    Returns the exit code."""
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    ...


# The sample export from the brief. Write it to disk with write_sample("orders-raw.csv").

SAMPLE_LINES = [
    "Order ID,Date,Email,SKU,Qty,Unit Price,Status",
    "HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid",
    "HB-10232,21/09/2026, Grace.Hopper@Example.com ,lamp-02,1,£49.00,Paid",
    "HB-10233,2026-09-22,linus@example.org,TEA-12,three,4.25,paid",
    "HB-10234,2026-09-31,margaret@example.com,MUG-STN,1,12.50,paid",
    "",
    "HB-10235,2026-09-22,not-an-email,PEN-05,4,1.20,shipped",
    'HB-10236,2026-09-23,chloe@example.fr,GRINDER-PRO,1,"£1,249.00",paid',
    "HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid",
    "HB-10237,2026-09-23,yusuf@example.com,TEA-12,2,4.255,pending",
    "HB-10238,2026-09-24,zoe@example.com,,1,8.00,paid",
    "HB-10239,2026-09-24,sam@example.com,MUG-STN,1,12.50,refunded,gift wrap",
    "HB-10240,2026-09-24,priya@example.com,LAMP-02,0,49.00,paid",
    ",,,,,,",
    "HB-10241,24/09/2026,omar@example.com,TEA-12,6,4.25,PENDING",
]


def write_sample(path, encoding="utf-8-sig"):
    """Write the sample export the way Excel saves it: a byte order mark and Windows line
    endings. Pass encoding="cp1252" for a copy from the partner's old laptop."""
    text = "\r\n".join(SAMPLE_LINES) + "\r\n"
    Path(path).write_bytes(text.encode(encoding))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
