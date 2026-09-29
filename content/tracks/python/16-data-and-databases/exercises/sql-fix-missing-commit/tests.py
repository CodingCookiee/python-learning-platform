import os
import sqlite3
import tempfile

from plp import test, hidden, raises
from solution import record_payment


def billing_database():
    """(the connection the function uses, a second connection like the dashboard's)"""
    path = os.path.join(tempfile.mkdtemp(), "billing.db")
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE invoices (number TEXT PRIMARY KEY, status TEXT NOT NULL);
        CREATE TABLE payments (id INTEGER PRIMARY KEY, invoice_number TEXT NOT NULL,
                               amount_cents INTEGER NOT NULL, paid_on TEXT NOT NULL);
        INSERT INTO invoices VALUES ('INV-0042', 'sent'), ('INV-0043', 'sent');
    """)
    return conn, sqlite3.connect(path)


@test("Another connection sees the invoice as paid")
def _():
    conn, dashboard = billing_database()
    record_payment(conn, "INV-0042", 125000, "2026-09-14")
    assert dashboard.execute("SELECT status FROM invoices WHERE number = 'INV-0042'").fetchone() == ("paid",)
    assert dashboard.execute("SELECT invoice_number, amount_cents FROM payments").fetchall() == [("INV-0042", 125000)]


@test("Leaves no transaction open after a payment")
def _():
    conn, _ = billing_database()
    record_payment(conn, "INV-0042", 125000, "2026-09-14")
    assert conn.in_transaction is False


@test("An unknown invoice raises and records nothing")
def _():
    conn, dashboard = billing_database()
    raises(ValueError, record_payment, conn, "INV-9999", 5000, "2026-09-14", match="INV-9999")
    assert conn.in_transaction is False
    assert conn.execute("SELECT count(*) FROM payments").fetchone() == (0,)


@hidden("A failed payment doesn't take the next good one with it")
def _():
    conn, dashboard = billing_database()
    try:
        record_payment(conn, "INV-9999", 5000, "2026-09-14")
    except ValueError:
        pass
    record_payment(conn, "INV-0043", 7000, "2026-09-15")
    conn.rollback()      # what a caller's error handling might do next
    assert dashboard.execute("SELECT invoice_number FROM payments").fetchall() == [("INV-0043",)]


@hidden("Leaves the connection open for the caller")
def _():
    conn, _ = billing_database()
    record_payment(conn, "INV-0042", 125000, "2026-09-14")
    assert conn.execute("SELECT count(*) FROM payments").fetchone() == (1,)
