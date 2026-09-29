import sqlite3

from plp import test, hidden
from solution import applications_per_company


def database():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT NOT NULL);
        INSERT INTO companies (id, name) VALUES (1, 'Northwind'), (2, 'Initech'), (3, 'Hooli'), (4, 'Globex');
        INSERT INTO applications (company_id, role) VALUES
            (1, 'Backend engineer'), (1, 'Platform engineer'), (1, 'SRE'),
            (3, 'Backend engineer'), (4, 'Data engineer');
    """)
    return conn


@test("Counts applications per company, most first")
def _():
    assert applications_per_company(database()) == [("Northwind", 3), ("Globex", 1), ("Hooli", 1), ("Initech", 0)]


@test("Keeps only companies with at least the minimum")
def _():
    assert applications_per_company(database(), min_applications=2) == [("Northwind", 3)]


@test("A company with no applications counts 0, not 1")
def _():
    counts = dict(applications_per_company(database()))
    assert counts["Initech"] == 0


@hidden("A minimum of 1 leaves out companies with none")
def _():
    assert applications_per_company(database(), 1) == [("Northwind", 3), ("Globex", 1), ("Hooli", 1)]


@hidden("A minimum above everyone gives an empty list")
def _():
    assert applications_per_company(database(), min_applications=10) == []


@hidden("Works with no applications at all")
def _():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT NOT NULL);
        INSERT INTO companies (name) VALUES ('Umbrella'), ('Acme');
    """)
    assert applications_per_company(conn) == [("Acme", 0), ("Umbrella", 0)]
