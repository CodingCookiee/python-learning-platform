import sqlite3

from plp import test, hidden, source_avoids
from solution import find_user


def database():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL)")
    conn.executemany(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        [
            ("admin@example.com", "Site admin"),
            ("ada@example.com", "Ada Lovelace"),
            ("o'brien@example.com", "Niamh O'Brien"),
        ],
    )
    return conn


@test("Finds a user by email")
def _():
    assert find_user(database(), "ada@example.com") == (2, "Ada Lovelace")


@test("An injection attempt finds nobody")
def _():
    assert find_user(database(), "' OR '1'='1") is None


@test("An email with an apostrophe works")
def _():
    assert find_user(database(), "o'brien@example.com") == (3, "Niamh O'Brien")


@hidden("A comment-out attack finds nobody either")
def _():
    assert find_user(database(), "nobody@example.com' OR 1=1 --") is None


@hidden("The SQL isn't built with an f-string")
def _():
    assert source_avoids(node="JoinedStr"), "Pass the email as a parameter instead of formatting it into the SQL"
