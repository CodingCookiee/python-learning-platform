import sqlite3

from plp import test, hidden, raises
from solution import migrate

MIGRATIONS = [
    [
        "CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)",
        "CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT NOT NULL)",
    ],
    ["ALTER TABLE applications ADD COLUMN salary INTEGER"],
]

THIRD = ["CREATE INDEX idx_applications_company ON applications (company_id)"]
BROKEN = [
    "CREATE TABLE interviews (id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL)",
    "ALTER TABLE applications ADD COLUMN notes TEXT",
    "CREATE INDEX idx_interviews_application ON interviews (applicaton_id)",
]


def version(conn):
    return conn.execute("PRAGMA user_version").fetchone()[0]


def tables(conn):
    return sorted(row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'"))


def columns(conn, table):
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


@test("Runs every migration once, then nothing")
def _():
    conn = sqlite3.connect(":memory:")
    assert migrate(conn, MIGRATIONS) == 2
    assert migrate(conn, MIGRATIONS) == 0
    assert version(conn) == 2
    assert tables(conn) == ["applications", "companies"]
    assert columns(conn, "applications") == ["id", "company_id", "role", "salary"]


@test("Runs only the new migration on an older database")
def _():
    conn = sqlite3.connect(":memory:")
    migrate(conn, MIGRATIONS[:1])
    assert version(conn) == 1
    assert migrate(conn, MIGRATIONS + [THIRD]) == 2
    assert version(conn) == 3


@test("A failing migration leaves no trace and keeps the earlier ones")
def _():
    conn = sqlite3.connect(":memory:")
    raises(sqlite3.OperationalError, migrate, conn, MIGRATIONS + [BROKEN])
    assert version(conn) == 2
    assert tables(conn) == ["applications", "companies"]
    assert "notes" not in columns(conn, "applications")
    assert conn.in_transaction is False


@hidden("Refuses a database newer than the code, and changes nothing")
def _():
    conn = sqlite3.connect(":memory:")
    migrate(conn, MIGRATIONS + [THIRD])
    raises(RuntimeError, migrate, conn, MIGRATIONS)
    assert version(conn) == 3


@hidden("Can carry on after the broken migration is fixed")
def _():
    conn = sqlite3.connect(":memory:")
    try:
        migrate(conn, MIGRATIONS + [BROKEN])
    except sqlite3.OperationalError:
        pass
    fixed = BROKEN[:2] + ["CREATE INDEX idx_interviews_application ON interviews (application_id)"]
    assert migrate(conn, MIGRATIONS + [fixed]) == 1
    assert version(conn) == 3
    assert "notes" in columns(conn, "applications")


@hidden("An empty list on a new database runs nothing")
def _():
    conn = sqlite3.connect(":memory:")
    assert migrate(conn, []) == 0
    assert version(conn) == 0
