import sqlite3

from plp import test, hidden, raises
from solution import upgrade


def database():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL, notes TEXT);
        INSERT INTO applications (company, role, notes) VALUES
            ('Northwind', 'Backend engineer', 'Referral from Priya'),
            ('Globex', 'Data engineer', 'Found on a job board'),
            ('Initech', 'Python developer', NULL);
    """)
    return conn


def columns(conn):
    return [column[1] for column in conn.execute("PRAGMA table_info(applications)")]


@test("Keeps every employer and backfills the source")
def _():
    conn = database()
    upgrade(conn)
    assert conn.execute("SELECT employer, source FROM applications ORDER BY id").fetchall() == [
        ("Northwind", "referral"),
        ("Globex", "job board"),
        ("Initech", "job board"),
    ]


@test("Renames company in place, so the columns stay in order")
def _():
    conn = database()
    upgrade(conn)
    assert columns(conn) == ["id", "employer", "role", "notes", "source"]


@test("New applications get 'job board' unless they say otherwise")
def _():
    conn = database()
    upgrade(conn)
    conn.execute("INSERT INTO applications (employer, role) VALUES ('Hooli', 'SRE')")
    conn.execute("INSERT INTO applications (employer, role, source) VALUES ('Umbrella', 'SRE', 'direct')")
    assert conn.execute("SELECT source FROM applications WHERE id > 3 ORDER BY id").fetchall() == [("job board",), ("direct",)]


@hidden("source is required and employer still is")
def _():
    conn = database()
    upgrade(conn)
    raises(sqlite3.IntegrityError, conn.execute, "INSERT INTO applications (employer, role, source) VALUES ('Hooli', 'SRE', NULL)")
    raises(sqlite3.IntegrityError, conn.execute, "INSERT INTO applications (role) VALUES ('SRE')")


@hidden("The migration is committed")
def _():
    conn = database()
    upgrade(conn)
    conn.rollback()
    assert conn.execute("SELECT count(*) FROM applications WHERE source = 'referral'").fetchone() == (1,)
