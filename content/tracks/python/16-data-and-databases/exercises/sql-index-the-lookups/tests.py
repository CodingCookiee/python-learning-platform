import sqlite3

from plp import test, hidden
from solution import add_indexes, query_plan

APPLICATIONS_FOR_COMPANY = "SELECT id, role FROM applications WHERE company_id = ?"
INTERVIEWS_FOR_APPLICATION = "SELECT id, scheduled_at FROM interviews WHERE application_id = ? ORDER BY scheduled_at"
RECENT_BY_STATUS = "SELECT id FROM applications WHERE status = ? AND applied_on >= ?"

QUERIES = [
    (APPLICATIONS_FOR_COMPANY, (7,)),
    (INTERVIEWS_FOR_APPLICATION, (3,)),
    (RECENT_BY_STATUS, ("interview", "2026-09-01")),
]


def database():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
                                   role TEXT NOT NULL, status TEXT NOT NULL, applied_on TEXT NOT NULL);
        CREATE TABLE interviews (id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL,
                                 scheduled_at TEXT NOT NULL, kind TEXT NOT NULL);
    """)
    conn.executemany(
        "INSERT INTO applications (company_id, role, status, applied_on) VALUES (?, ?, ?, ?)",
        [(n % 9, f"Role {n}", ["applied", "interview", "rejected"][n % 3], f"2026-09-{n % 28 + 1:02d}") for n in range(60)],
    )
    conn.executemany(
        "INSERT INTO interviews (application_id, scheduled_at, kind) VALUES (?, ?, ?)",
        [(n % 20, f"2026-10-{n % 28 + 1:02d} 10:00", "video") for n in range(60)],
    )
    return conn


def slow_steps(conn):
    return {sql: [step for step in query_plan(conn, sql, params) if "SCAN" in step or "TEMP B-TREE" in step]
            for sql, params in QUERIES}


@test("Reports a scan before the indexes, and a search after")
def _():
    conn = database()
    assert query_plan(conn, APPLICATIONS_FOR_COMPANY, (7,)) == ["SCAN applications"]
    add_indexes(conn)
    plan = query_plan(conn, APPLICATIONS_FOR_COMPANY, (7,))
    assert len(plan) == 1 and plan[0].startswith("SEARCH applications USING INDEX"), f"The plan is still {plan}"


@test("No query scans a table or sorts in a temporary B-tree")
def _():
    conn = database()
    add_indexes(conn)
    assert slow_steps(conn) == {sql: [] for sql, _ in QUERIES}


@test("Running add_indexes twice doesn't fail")
def _():
    conn = database()
    add_indexes(conn)
    add_indexes(conn)


@hidden("query_plan passes parameters and reads the detail column")
def _():
    conn = database()
    assert query_plan(conn, "SELECT count(*) FROM interviews WHERE id = ?", (5,)) == [
        "SEARCH interviews USING INTEGER PRIMARY KEY (rowid=?)"
    ]


@hidden("The queries return the same rows with the indexes")
def _():
    conn = database()
    before = [conn.execute(sql, params).fetchall() for sql, params in QUERIES]
    add_indexes(conn)
    after = [conn.execute(sql, params).fetchall() for sql, params in QUERIES]
    assert [sorted(rows) for rows in after] == [sorted(rows) for rows in before]
