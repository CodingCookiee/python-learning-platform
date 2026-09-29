import sqlite3

from plp import test, hidden, source_avoids
from solution import revenue_by_region

ORDERS = [
    ("North", "paid", 90000),
    ("South", "paid", 91000),
    ("North", "paid", 48000),
    ("East", "paid", 12500),
    ("East", "refunded", 400000),
    ("West", "cancelled", 30000),
    ("South", None, 5000),
]


def database(rows=ORDERS):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, region TEXT, status TEXT, total_cents INTEGER)")
    conn.executemany("INSERT INTO orders (region, status, total_cents) VALUES (?, ?, ?)", rows)
    return conn


def statements_run(conn):
    """Record every SQL statement the connection runs."""
    seen = []
    conn.set_trace_callback(seen.append)
    return seen


@test("Returns paid revenue per region, biggest first")
def _():
    assert revenue_by_region(database()) == [("North", 138000), ("South", 91000), ("East", 12500)]


@test("Runs one query that groups in the database")
def _():
    conn = database()
    seen = statements_run(conn)
    revenue_by_region(conn)
    assert len(seen) == 1, f"Expected one query, saw {len(seen)}: {seen}"
    assert "GROUP BY" in seen[0].upper(), "Let the query GROUP BY region"


@test("No Python loop or comprehension is left")
def _():
    assert source_avoids(node="For"), "Remove the for loop: the query should do the adding up"
    assert source_avoids(node="ListComp") and source_avoids(node="DictComp") and source_avoids(node="GeneratorExp"), (
        "Return the query's rows directly, without a comprehension"
    )


@hidden("Breaks ties on revenue by region name")
def _():
    conn = database([("West", "paid", 100), ("East", "paid", 100), ("North", "paid", 50)])
    assert revenue_by_region(conn) == [("East", 100), ("West", 100), ("North", 50)]


@hidden("No paid orders means no rows")
def _():
    assert revenue_by_region(database([("North", "refunded", 100)])) == []
