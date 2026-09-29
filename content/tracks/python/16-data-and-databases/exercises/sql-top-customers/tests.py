import sqlite3

from plp import test, hidden
from solution import top_customers


def database():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL,
                             placed_on TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TABLE order_lines (order_id INTEGER NOT NULL, sku TEXT NOT NULL,
                                  quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL);
        INSERT INTO customers (id, name) VALUES (1, 'Acme Ltd'), (2, 'Globex'), (3, 'Initech'), (4, 'Umbrella');
        INSERT INTO orders (id, customer_id, placed_on, status) VALUES
            (101, 1, '2026-09-02', 'paid'),
            (102, 1, '2026-09-20', 'paid'),
            (103, 2, '2026-09-05', 'paid'),
            (104, 3, '2026-09-30', 'paid'),
            (105, 4, '2026-09-11', 'refunded'),
            (106, 2, '2026-08-31', 'paid'),
            (107, 3, '2026-10-01', 'paid');
        INSERT INTO order_lines VALUES
            (101, 'DESK-OAK', 1, 30000), (101, 'LAMP-01', 2, 4500), (101, 'CABLE', 3, 1000),
            (102, 'CHAIR-ERG', 1, 9000),
            (103, 'DESK-OAK', 1, 30000), (103, 'CHAIR-ERG', 1, 6000),
            (104, 'LAMP-01', 1, 4500),
            (105, 'DESK-OAK', 5, 30000),
            (106, 'DESK-OAK', 2, 30000),
            (107, 'CHAIR-ERG', 4, 9000);
    """)
    return conn


@test("Ranks September's customers by revenue")
def _():
    assert top_customers(database(), "2026-09-01", "2026-10-01") == [
        ("Acme Ltd", 2, 51000),
        ("Globex", 1, 36000),
        ("Initech", 1, 4500),
    ]


@test("Counts orders, not order lines")
def _():
    rows = top_customers(database(), "2026-09-01", "2026-10-01")
    assert rows[0][1] == 2, "Acme Ltd placed 2 orders (with 4 lines between them)"


@test("Leaves out customers below the minimum revenue")
def _():
    assert top_customers(database(), "2026-09-01", "2026-10-01", min_revenue_cents=36000) == [
        ("Acme Ltd", 2, 51000),
        ("Globex", 1, 36000),
    ]


@hidden("The end date is excluded and the start date included")
def _():
    assert top_customers(database(), "2026-08-31", "2026-09-30") == [("Globex", 2, 96000), ("Acme Ltd", 2, 51000)]


@hidden("Refunded orders never count")
def _():
    names = [row[0] for row in top_customers(database(), "2026-01-01", "2027-01-01", limit=10)]
    assert "Umbrella" not in names


@hidden("Respects the limit")
def _():
    assert top_customers(database(), "2026-01-01", "2027-01-01", limit=1) == [("Globex", 2, 96000)]


@hidden("An empty period gives no rows")
def _():
    assert top_customers(database(), "2025-01-01", "2025-02-01") == []
