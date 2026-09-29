import sqlite3

from plp import test, hidden, raises
from solution import import_payments

GOOD = """invoice,amount,paid_on
INV-0042,1250.00,2026-09-14
INV-0043,40.5,2026-09-14
INV-0044,3800,2026-09-15
"""


def database():
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE invoices (number TEXT PRIMARY KEY);
        CREATE TABLE payments (
            id INTEGER PRIMARY KEY,
            invoice_number TEXT NOT NULL REFERENCES invoices (number),
            amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
            paid_on TEXT NOT NULL
        );
        INSERT INTO invoices VALUES ('INV-0042'), ('INV-0043'), ('INV-0044');
    """)
    return conn


def stored(conn):
    return conn.execute("SELECT invoice_number, amount_cents, paid_on FROM payments ORDER BY id").fetchall()


@test("Imports every row, in pence")
def _():
    conn = database()
    assert import_payments(conn, GOOD) == 3
    assert stored(conn) == [
        ("INV-0042", 125000, "2026-09-14"),
        ("INV-0043", 4050, "2026-09-14"),
        ("INV-0044", 380000, "2026-09-15"),
    ]


@test("A bad amount imports nothing and names its line")
def _():
    conn = database()
    bad = GOOD.replace("40.5", "£40.50")
    raises(ValueError, import_payments, conn, bad, match=r"^line 3: .*£40.50")
    assert stored(conn) == []
    assert conn.in_transaction is False


@test("An unknown invoice imports nothing and names its line")
def _():
    conn = database()
    bad = GOOD.replace("INV-0044", "INV-9999")
    raises(ValueError, import_payments, conn, bad, match=r"^line 4: unknown invoice INV-9999")
    assert stored(conn) == []


@hidden("A zero amount is refused by the CHECK constraint")
def _():
    conn = database()
    raises(ValueError, import_payments, conn, GOOD.replace("1250.00", "0.00"), match=r"^line 2")
    assert stored(conn) == []
    assert conn.in_transaction is False


@hidden("A file with only a header imports nothing, without error")
def _():
    conn = database()
    assert import_payments(conn, "invoice,amount,paid_on\n") == 0


@hidden("The import is committed")
def _():
    conn = database()
    import_payments(conn, GOOD)
    conn.rollback()
    assert len(stored(conn)) == 3


@hidden("A failed import doesn't undo payments already in the table")
def _():
    conn = database()
    import_payments(conn, "invoice,amount,paid_on\nINV-0042,10,2026-09-01\n")
    raises(ValueError, import_payments, conn, GOOD.replace("3800", "lots"))
    assert stored(conn) == [("INV-0042", 1000, "2026-09-01")]
