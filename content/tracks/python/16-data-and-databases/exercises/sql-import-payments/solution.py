import csv
import io
import sqlite3
from decimal import Decimal, InvalidOperation


def to_cents(amount):
    try:
        return int(Decimal(amount) * 100)
    except InvalidOperation:
        raise ValueError(f"amount {amount!r} isn't a number") from None


def import_payments(conn, csv_text):
    """Insert every payment in csv_text and return how many, or insert none and raise
    ValueError("line N: ...") for the first bad row."""
    reader = csv.DictReader(io.StringIO(csv_text))
    imported = 0
    with conn:
        for row in reader:
            try:
                conn.execute(
                    "INSERT INTO payments (invoice_number, amount_cents, paid_on) VALUES (?, ?, ?)",
                    (row["invoice"], to_cents(row["amount"]), row["paid_on"]),
                )
            except ValueError as error:
                raise ValueError(f"line {reader.line_num}: {error}") from error
            except sqlite3.IntegrityError as error:
                if "FOREIGN KEY" in str(error):
                    raise ValueError(f"line {reader.line_num}: unknown invoice {row['invoice']}") from error
                raise ValueError(f"line {reader.line_num}: amount must be more than zero") from error
            imported += 1
    return imported
