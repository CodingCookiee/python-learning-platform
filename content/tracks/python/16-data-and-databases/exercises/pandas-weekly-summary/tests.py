import sqlite3

from plp import test, hidden
from solution import weekly_summary

HEADER = "week,applied,responses,interviews,offers,response_rate"


def database(rows):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT, applied_on TEXT, status TEXT)")
    conn.executemany("INSERT INTO applications (company, applied_on, status) VALUES (?, ?, ?)", rows)
    return conn


SAMPLE = [
    ("Northwind", "2026-08-31", "interview"),
    ("Globex", "2026-09-02", "rejected"),
    ("Initech", "2026-09-06", "applied"),
    ("Hooli", "2026-09-14", "offer"),
    ("Umbrella", "2026-09-20", "applied"),
]


@test("Summarises each week, including an empty one")
def _():
    assert weekly_summary(database(SAMPLE)).splitlines() == [
        HEADER,
        "2026-08-31,3,2,1,0,66.7",
        "2026-09-07,0,0,0,0,0.0",
        "2026-09-14,2,1,1,1,50.0",
    ]


@test("With no applications, the report is just the header")
def _():
    assert weekly_summary(database([])).splitlines() == [HEADER]


@test("A Sunday belongs to the week that started the Monday before")
def _():
    report = weekly_summary(database([("Acme", "2026-09-13", "applied"), ("Hooli", "2026-09-14", "applied")]))
    assert report.splitlines() == [HEADER, "2026-09-07,1,0,0,0,0.0", "2026-09-14,1,0,0,0,0.0"]


@hidden("Rows come out in week order whatever order they were stored in")
def _():
    rows = list(reversed(SAMPLE))
    assert weekly_summary(database(rows)).splitlines()[1:] == [
        "2026-08-31,3,2,1,0,66.7",
        "2026-09-07,0,0,0,0,0.0",
        "2026-09-14,2,1,1,1,50.0",
    ]


@hidden("A single week with every status")
def _():
    conn = database([
        ("A", "2026-10-05", "applied"), ("B", "2026-10-06", "interview"),
        ("C", "2026-10-07", "offer"), ("D", "2026-10-08", "rejected"),
    ])
    assert weekly_summary(conn).splitlines() == [HEADER, "2026-10-05,4,3,2,1,75.0"]
