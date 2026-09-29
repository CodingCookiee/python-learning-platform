import csv
import io
import sqlite3
from decimal import Decimal, InvalidOperation


def import_payments(conn, csv_text):
    """Insert every payment in csv_text and return how many, or insert none and raise
    ValueError("line N: ...") for the first bad row."""
    ...
