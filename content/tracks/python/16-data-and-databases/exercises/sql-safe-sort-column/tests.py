import sqlite3

from plp import test, hidden, raises
from solution import list_invoices


def database():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE invoices (number TEXT PRIMARY KEY, customer TEXT, amount_cents INTEGER, status TEXT, issued_on TEXT)")
    conn.executemany(
        "INSERT INTO invoices VALUES (?, ?, ?, ?, ?)",
        [
            ("INV-001", "Globex", 125000, "paid", "2026-09-01"),
            ("INV-002", "Acme", 4000, "sent", "2026-09-12"),
            ("INV-003", "Initech", 380000, "sent", "2026-09-05"),
            ("INV-004", "Acme", 90000, "paid", "2026-09-05"),
        ],
    )
    return conn


@test("Sorts by amount, biggest first, and filters by status")
def _():
    conn = database()
    assert list_invoices(conn, sort="amount", descending=True) == ["INV-003", "INV-001", "INV-004", "INV-002"]
    assert list_invoices(conn, status="paid") == ["INV-001", "INV-004"]


@test("Refuses a sort that isn't on the list, and the table survives")
def _():
    conn = database()
    raises(ValueError, list_invoices, conn, sort="amount; DROP TABLE invoices")
    assert conn.execute("SELECT count(*) FROM invoices").fetchone() == (4,)


@test("Treats a hostile status as a value")
def _():
    assert list_invoices(database(), status="paid' OR '1'='1") == []


@hidden("Sorts by date by default, ties broken by number")
def _():
    assert list_invoices(database()) == ["INV-001", "INV-003", "INV-004", "INV-002"]


@hidden("Ties stay in number order when descending")
def _():
    assert list_invoices(database(), sort="customer", descending=True) == ["INV-003", "INV-001", "INV-002", "INV-004"]


@hidden("Refuses a column that exists but isn't offered")
def _():
    raises(ValueError, list_invoices, database(), sort="amount_cents")
    raises(ValueError, list_invoices, database(), sort="status")


@hidden("Combines sort and status")
def _():
    assert list_invoices(database(), sort="number", descending=True, status="sent") == ["INV-003", "INV-002"]
