import sqlite3

from plp import test, hidden
from solution import open_applications

SAMPLE = [
    ("Northwind", "Backend engineer", "interview", "2026-09-01"),
    ("Initech", "Python developer", "rejected", "2026-09-02"),
    ("Globex", "Data engineer", "applied", "2026-09-03"),
    ("Hooli", "Backend engineer", "offer", "2026-09-05"),
    ("Umbrella", "Platform engineer", "applied", "2026-09-08"),
]


def database(rows):
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE applications (
            id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL,
            status TEXT NOT NULL, applied_on TEXT NOT NULL
        )
        """
    )
    conn.executemany("INSERT INTO applications (company, role, status, applied_on) VALUES (?, ?, ?, ?)", rows)
    return conn


@test("Lists open applications, oldest first")
def _():
    assert open_applications(database(SAMPLE)) == [
        ("Northwind", "Backend engineer"),
        ("Globex", "Data engineer"),
        ("Umbrella", "Platform engineer"),
    ]


@test("Leaves out offers and rejections")
def _():
    conn = database([("Hooli", "Backend engineer", "offer", "2026-09-05"), ("Initech", "Dev", "rejected", "2026-09-02")])
    assert open_applications(conn) == []


@test("Breaks a tie on the date by company")
def _():
    conn = database([
        ("Umbrella", "Platform engineer", "applied", "2026-09-08"),
        ("Acme", "SRE", "interview", "2026-09-08"),
    ])
    assert open_applications(conn) == [("Acme", "SRE"), ("Umbrella", "Platform engineer")]


@hidden("Sorts by date even when rows were inserted out of order")
def _():
    conn = database([
        ("Zeta", "Analyst", "applied", "2026-10-02"),
        ("Beta", "Engineer", "applied", "2026-09-30"),
        ("Alpha", "Engineer", "interview", "2026-10-01"),
    ])
    assert open_applications(conn) == [("Beta", "Engineer"), ("Alpha", "Engineer"), ("Zeta", "Analyst")]
