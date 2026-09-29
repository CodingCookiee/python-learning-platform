import sqlite3

from plp import test, hidden
from solution import Application, find_applications, get_application


def database():
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE applications (
            id INTEGER PRIMARY KEY, applied_on TEXT NOT NULL, company TEXT NOT NULL,
            role TEXT NOT NULL, status TEXT NOT NULL
        )
        """
    )
    conn.executemany(
        "INSERT INTO applications (applied_on, company, role, status) VALUES (?, ?, ?, ?)",
        [
            ("2026-09-01", "Northwind", "Backend engineer", "interview"),
            ("2026-09-03", "Globex", "Data engineer", "applied"),
            ("2026-09-08", "Umbrella", "Platform engineer", "applied"),
            ("2026-09-04", "Initech", "Python developer", "rejected"),
        ],
    )
    return conn


@test("Finds applications by status, newest first")
def _():
    assert find_applications(database(), "applied") == [
        Application(3, "Umbrella", "Platform engineer", "applied", "2026-09-08"),
        Application(2, "Globex", "Data engineer", "applied", "2026-09-03"),
    ]


@test("Gets one application by id, or None")
def _():
    conn = database()
    assert get_application(conn, 1) == Application(1, "Northwind", "Backend engineer", "interview", "2026-09-01")
    assert get_application(conn, 99) is None


@test("Leaves the connection's row factory alone")
def _():
    conn = database()
    find_applications(conn, "applied")
    get_application(conn, 1)
    assert conn.execute("SELECT company FROM applications WHERE id = 1").fetchone() == ("Northwind",)


@hidden("Returns an empty list for a status nobody has")
def _():
    assert find_applications(database(), "offer") == []


@hidden("Breaks a tie on the date by id")
def _():
    conn = database()
    conn.execute("INSERT INTO applications (applied_on, company, role, status) VALUES ('2026-09-03', 'Acme', 'SRE', 'applied')")
    assert [a.id for a in find_applications(conn, "applied")] == [3, 2, 5]


@hidden("Returns real Application objects")
def _():
    found = get_application(database(), 4)
    assert isinstance(found, Application)
    assert found.company == "Initech"
