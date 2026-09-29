import sqlite3

from plp import test, hidden, raises
from solution import reserve_stock


def database():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, on_hand INTEGER NOT NULL)")
    conn.executemany("INSERT INTO stock VALUES (?, ?)", [("MUG-STN", 5), ("V60-100", 0)])
    conn.commit()
    return conn


def on_hand(conn, sku):
    return conn.execute("SELECT on_hand FROM stock WHERE sku = ?", (sku,)).fetchone()[0]


@test("Reserves when there's enough, refuses when there isn't")
def _():
    conn = database()
    assert reserve_stock(conn, "MUG-STN", 2) is True
    assert on_hand(conn, "MUG-STN") == 3
    assert reserve_stock(conn, "MUG-STN", 5) is False
    assert on_hand(conn, "MUG-STN") == 3


@test("Commits the reservation")
def _():
    conn = database()
    reserve_stock(conn, "MUG-STN", 1)
    assert conn.in_transaction is False
    conn.rollback()
    assert on_hand(conn, "MUG-STN") == 4


@test("Checks and changes the stock in one UPDATE, without reading it first")
def _():
    conn = database()
    statements = []
    conn.set_trace_callback(statements.append)
    reserve_stock(conn, "MUG-STN", 1)
    reads = [s for s in statements if s.lstrip().upper().startswith("SELECT")]
    updates = [s for s in statements if s.lstrip().upper().startswith("UPDATE")]
    assert reads == [], "Don't SELECT the stock first: another request can change it before you write"
    assert len(updates) == 1


@hidden("Can take the last unit, but not one more")
def _():
    conn = database()
    assert reserve_stock(conn, "MUG-STN", 5) is True
    assert on_hand(conn, "MUG-STN") == 0
    assert reserve_stock(conn, "MUG-STN", 1) is False


@hidden("An unknown SKU is refused")
def _():
    assert reserve_stock(database(), "LAMP-01", 1) is False


@hidden("A quantity below 1 raises ValueError and changes nothing")
def _():
    conn = database()
    raises(ValueError, reserve_stock, conn, "MUG-STN", 0)
    raises(ValueError, reserve_stock, conn, "MUG-STN", -3)
    assert on_hand(conn, "MUG-STN") == 5
