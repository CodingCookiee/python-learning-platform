import sqlite3

from plp import test, hidden, raises
from solution import create_invoices_table


def fresh():
    conn = sqlite3.connect(":memory:")
    create_invoices_table(conn)
    return conn


@test("A new invoice starts as a draft with no issue date")
def _():
    conn = fresh()
    conn.execute("INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-001', 'Acme', 125000)")
    assert conn.execute("SELECT number, status, issued_on FROM invoices").fetchone() == ("INV-001", "draft", None)


@test("Has the six columns, in order")
def _():
    conn = fresh()
    assert [column[1] for column in conn.execute("PRAGMA table_info(invoices)")] == [
        "id", "number", "customer", "amount_cents", "status", "issued_on",
    ]


@test("Refuses a duplicate invoice number")
def _():
    conn = fresh()
    conn.execute("INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-001', 'Acme', 100)")
    raises(
        sqlite3.IntegrityError, conn.execute,
        "INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-001', 'Globex', 200)",
    )


@test("Refuses a status that isn't draft, sent or paid")
def _():
    raises(
        sqlite3.IntegrityError, fresh().execute,
        "INSERT INTO invoices (number, customer, amount_cents, status) VALUES ('INV-002', 'Acme', 100, 'overdue')",
    )


@hidden("Refuses a negative amount, but allows zero")
def _():
    conn = fresh()
    raises(
        sqlite3.IntegrityError, conn.execute,
        "INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-003', 'Acme', -1)",
    )
    conn.execute("INSERT INTO invoices (number, customer, amount_cents) VALUES ('INV-004', 'Acme', 0)")
    assert conn.execute("SELECT count(*) FROM invoices").fetchone() == (1,)


@hidden("Refuses a missing number, customer, amount or status")
def _():
    conn = fresh()
    raises(sqlite3.IntegrityError, conn.execute, "INSERT INTO invoices (customer, amount_cents) VALUES ('Acme', 100)")
    raises(sqlite3.IntegrityError, conn.execute, "INSERT INTO invoices (number, amount_cents) VALUES ('INV-5', 100)")
    raises(sqlite3.IntegrityError, conn.execute, "INSERT INTO invoices (number, customer) VALUES ('INV-6', 'Acme')")
    raises(
        sqlite3.IntegrityError, conn.execute,
        "INSERT INTO invoices (number, customer, amount_cents, status) VALUES ('INV-7', 'Acme', 100, NULL)",
    )


@hidden("Accepts every valid status and an issue date")
def _():
    conn = fresh()
    for number, status in [("INV-8", "draft"), ("INV-9", "sent"), ("INV-10", "paid")]:
        conn.execute(
            "INSERT INTO invoices (number, customer, amount_cents, status, issued_on) "
            "VALUES (?, 'Acme', 100, ?, '2026-09-01')",
            (number, status),
        )
    assert conn.execute("SELECT count(*) FROM invoices").fetchone() == (3,)
