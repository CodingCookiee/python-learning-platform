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
from contextlib import ExitStack
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

log = logging.getLogger(__name__)

REQUIRED = ["order_id", "date", "email", "sku", "qty", "unit_price", "status"]
CLEAN_COLUMNS = ["order_id", "order_date", "email", "sku", "quantity", "unit_price", "total", "status"]
ERROR_COLUMNS = ["line", "order_id", "field", "value", "problem"]
STATUSES = ("paid", "pending", "refunded")
CENTS = Decimal("0.01")

ORDER_ID = re.compile(r"[A-Z]{2}-\d{4,}")
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
DAY_FIRST_DATE = re.compile(r"\d{2}/\d{2}/\d{4}")
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
SKU = re.compile(r"[A-Z0-9]+(?:-[A-Z0-9]+)*")
WHOLE_NUMBER = re.compile(r"[+-]?\d+")


class CleanerError(Exception):
    """Base class for everything the cleaner raises on purpose."""


class InputFileError(CleanerError):
    """The file can't be processed at all: it's missing, or lacks a required column."""


class FieldError(CleanerError, ValueError):
    """One problem with one field of one row."""

    def __init__(self, field, value, problem):
        super().__init__(f"{field} {problem}")
        self.field = field
        self.value = value
        self.problem = problem


@dataclass
class Summary:
    """What main() reports once a file has been cleaned."""

    rows: int = 0          # rows read, not counting rows whose fields are all empty
    clean: int = 0         # rows written to the clean file
    rejected: int = 0      # rows written to the error report
    problems: int = 0      # lines in the error report


# One cleaner per field. Each takes the raw text, returns the clean value, or raises FieldError.


def required(field, value):
    """value stripped, or FieldError if that leaves nothing."""
    value = value.strip()
    if not value:
        raise FieldError(field, value, "is required")
    return value


def clean_order_id(value):
    value = required("order_id", value).upper()
    if not ORDER_ID.fullmatch(value):
        raise FieldError("order_id", value, "must look like HB-10231")
    return value


def clean_date(value):
    value = required("date", value)
    try:
        if ISO_DATE.fullmatch(value):
            return date.fromisoformat(value)
        if DAY_FIRST_DATE.fullmatch(value):
            return datetime.strptime(value, "%d/%m/%Y").date()
    except ValueError:
        pass
    raise FieldError("date", value, "must be a real date like 2026-09-21 or 21/09/2026")


def clean_email(value):
    value = required("email", value).lower()
    if not EMAIL.fullmatch(value):
        raise FieldError("email", value, "must be an email address")
    return value


def clean_sku(value):
    value = required("sku", value).upper()
    if not SKU.fullmatch(value):
        raise FieldError("sku", value, "must be letters and digits joined by hyphens")
    return value


def clean_quantity(value):
    value = required("qty", value)
    if not WHOLE_NUMBER.fullmatch(value):
        raise FieldError("qty", value, "must be a whole number")
    quantity = int(value)
    if quantity < 1:
        raise FieldError("qty", value, "must be at least 1")
    return quantity


def clean_price(value):
    value = required("unit_price", value)
    try:
        price = Decimal(value.removeprefix("£").replace(",", ""))
    except InvalidOperation:
        raise FieldError("unit_price", value, "must be an amount like 12.50") from None
    if not price.is_finite():
        raise FieldError("unit_price", value, "must be an amount like 12.50")
    if price <= 0:
        raise FieldError("unit_price", value, "must be more than zero")
    if price.as_tuple().exponent < -2:
        raise FieldError("unit_price", value, "must have at most 2 decimal places")
    return price.quantize(CENTS)


def clean_status(value):
    value = required("status", value).lower()
    if value not in STATUSES:
        raise FieldError("status", value, f"must be one of {', '.join(STATUSES)}")
    return value


CLEANERS = {
    "order_id": clean_order_id,
    "date": clean_date,
    "email": clean_email,
    "sku": clean_sku,
    "qty": clean_quantity,
    "unit_price": clean_price,
    "status": clean_status,
}


def clean_row(row):
    """The eight clean columns for one row (a dict keyed by the REQUIRED names), or an
    ExceptionGroup("invalid row", [...]) holding a FieldError for every problem in it."""
    values = {}
    errors = []
    for field, cleaner in CLEANERS.items():
        try:
            values[field] = cleaner(row.get(field) or "")
        except FieldError as error:
            errors.append(error)
    if errors:
        raise ExceptionGroup("invalid row", errors)
    return {
        "order_id": values["order_id"],
        "order_date": values["date"].isoformat(),
        "email": values["email"],
        "sku": values["sku"],
        "quantity": values["qty"],
        "unit_price": values["unit_price"],
        "total": (values["unit_price"] * values["qty"]).quantize(CENTS),
        "status": values["status"],
    }


def normalise(name):
    """A column name as clean_row expects it: "  Unit Price " becomes "unit_price"."""
    return "_".join((name or "").strip().lower().split())


def read_text(source):
    """The text of the file at source: UTF-8 (with or without a BOM), or cp1252 as a fallback."""
    path = Path(source)
    try:
        data = path.read_bytes()
    except FileNotFoundError:
        raise InputFileError(f"{path.name} not found") from None
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        log.warning("%s isn't UTF-8; reading it as cp1252", path.name)
        return data.decode("cp1252", errors="replace")


def is_empty(row):
    """True if every field of a DictReader row is empty or missing."""
    values = [value for key, value in row.items() if key is not None] + list(row.get(None) or [])
    return all(not (value or "").strip() for value in values)


def check_row(row, header_size, line, first_seen):
    """The clean row. Raises FieldError, or an ExceptionGroup of them, for a bad row."""
    extra = row.pop(None, None) or []
    fields = [value for value in row.values() if value is not None] + list(extra)
    if len(fields) != header_size:
        raise FieldError("row", "", f"has {len(fields)} fields, expected {header_size}")
    clean = clean_row(row)
    key = (clean["order_id"], clean["sku"])
    if key in first_seen:
        raise FieldError("order_id", clean["order_id"], f"duplicate of line {first_seen[key]}")
    first_seen[key] = line
    return clean


def clean_file(source, clean_path, errors_path):
    """Clean the export at source, write the clean rows and the error report, and return a
    Summary. Raises InputFileError if the file is missing or lacks a required column."""
    name = Path(source).name
    reader = csv.DictReader(io.StringIO(read_text(source), newline=""))
    header = [normalise(column) for column in reader.fieldnames or []]
    missing = [column for column in REQUIRED if column not in header]
    if missing:
        raise InputFileError(f"{name} is missing columns: {', '.join(missing)}")
    reader.fieldnames = header

    summary = Summary()
    first_seen = {}
    with ExitStack() as stack:
        clean_out = stack.enter_context(open(clean_path, "w", newline="", encoding="utf-8"))
        errors_out = stack.enter_context(open(errors_path, "w", newline="", encoding="utf-8"))
        clean_writer = csv.DictWriter(clean_out, CLEAN_COLUMNS)
        error_writer = csv.DictWriter(errors_out, ERROR_COLUMNS)
        clean_writer.writeheader()
        error_writer.writeheader()

        for row in reader:
            if is_empty(row):
                continue
            summary.rows += 1
            line = reader.line_num
            order_id = (row.get("order_id") or "").strip()
            problems = []
            try:
                clean = check_row(row, len(header), line, first_seen)
            except* FieldError as group:
                problems = list(group.exceptions)
            except* Exception as group:
                error = group.exceptions[0]
                log.exception("line %d: unexpected error while cleaning", line, exc_info=error)
                problems = [FieldError("row", "", f"unexpected error: {type(error).__name__}: {error}")]
            if problems:
                summary.rejected += 1
                summary.problems += len(problems)
                log.info("line %d rejected with %s", line, plural(len(problems), "problem"))
                for problem in problems:
                    error_writer.writerow(
                        {
                            "line": line,
                            "order_id": order_id,
                            "field": problem.field,
                            "value": problem.value,
                            "problem": problem.problem,
                        }
                    )
            else:
                summary.clean += 1
                clean_writer.writerow(clean)
    return summary


def plural(count, word):
    """Like "1 row" or "3 rows"."""
    return f"{count} {word}{'' if count == 1 else 's'}"


def main(argv):
    """The command line. argv is the list of arguments after the program name.
    Returns the exit code."""
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    if len(argv) != 1:
        print("usage: python cleaner.py <orders.csv>", file=sys.stderr)
        return 2
    source = Path(argv[0])
    clean_path = source.with_name(f"{source.stem}-clean.csv")
    errors_path = source.with_name(f"{source.stem}-errors.csv")
    try:
        summary = clean_file(source, clean_path, errors_path)
    except InputFileError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    print(f"Cleaned {source.name}: {plural(summary.rows, 'row')} read")
    print(f"  {plural(summary.clean, 'clean row')} written to {clean_path.name}")
    print(
        f"  {plural(summary.rejected, 'rejected row')}, {plural(summary.problems, 'problem')} "
        f"written to {errors_path.name}"
    )
    return 0 if summary.rejected == 0 else 1


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
