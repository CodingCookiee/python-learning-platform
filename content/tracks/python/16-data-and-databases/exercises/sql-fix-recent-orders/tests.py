import sqlite3

from plp import test, hidden
from solution import recent_orders

ORDERS = [
    ("SO-1001", "ada@example.com", "2025-11-02 10:00", "shipped"),
    ("SO-1002", "grace@example.com", "2026-01-15 12:30", "shipped"),
    ("SO-1003", "ada@example.com", "2026-02-20 08:15", "shipped"),
    ("SO-1004", "ada@example.com", "2026-06-01 17:45", "paid"),
    ("SO-1005", "ada@example.com", "2026-07-11 09:00", "cancelled"),
    ("SO-1007", "ada@example.com", "2026-08-30 19:20", "shipped"),
    ("SO-1008", "grace@example.com", "2026-09-10 11:00", None),
    ("SO-1009", "ada@example.com", "2026-09-14 09:30", None),
]


def database(rows=ORDERS):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE orders (number TEXT PRIMARY KEY, customer TEXT NOT NULL, placed_on TEXT NOT NULL, status TEXT)")
    conn.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", rows)
    return conn


@test("Shows the three most recent orders, newest first")
def _():
    assert recent_orders(database(), "ada@example.com") == ["SO-1009", "SO-1007", "SO-1004"]


@test("Includes an order that hasn't been processed yet")
def _():
    assert recent_orders(database(), "grace@example.com") == ["SO-1008", "SO-1002"]


@test("Leaves out cancelled orders")
def _():
    assert "SO-1005" not in recent_orders(database(), "ada@example.com", limit=10)


@hidden("Respects the limit")
def _():
    conn = database()
    assert recent_orders(conn, "ada@example.com", limit=1) == ["SO-1009"]
    assert recent_orders(conn, "ada@example.com", limit=10) == ["SO-1009", "SO-1007", "SO-1004", "SO-1003", "SO-1001"]


@hidden("Breaks a tie on the time with the higher order number")
def _():
    conn = database([
        ("SO-2001", "linus@example.com", "2026-09-20 10:00", "paid"),
        ("SO-2002", "linus@example.com", "2026-09-20 10:00", None),
    ])
    assert recent_orders(conn, "linus@example.com") == ["SO-2002", "SO-2001"]


@hidden("An unknown customer has no orders")
def _():
    assert recent_orders(database(), "nobody@example.com") == []
