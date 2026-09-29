import math

import pandas as pd

from plp import test, hidden
from solution import clean_leads


def leads():
    return pd.DataFrame({
        "name": [" Ada Lovelace", "Grace Hopper ", "Ada Lovelace", "Anonymous", "Linus Torvalds", "No Email"],
        "email": ["ADA@acme.example", " grace@globex.example", "ada@acme.example ", None, "linus@initech.example", "   "],
        "company": ["Acme", "Globex", "Acme", "?", "Initech", "Hooli"],
        "budget": ["£5,000", "12000", "£7,500", "100", "ask me", "£1"],
        "submitted_at": [
            "2026-09-01 09:15", "2026-09-02 14:00", "2026-09-05 11:30",
            "2026-09-06 08:00", "2026-09-07 16:45", "2026-09-08 10:00",
        ],
    })


def records(df, columns):
    """Rows as dicts, with NaN shown as None so missing values compare equal."""
    return [
        {key: (None if isinstance(value, float) and math.isnan(value) else value) for key, value in row.items()}
        for row in df[columns].to_dict("records")
    ]


@test("Cleans emails and budgets and keeps each latest submission")
def _():
    assert records(clean_leads(leads()), ["email", "budget"]) == [
        {"email": "grace@globex.example", "budget": 12000.0},
        {"email": "ada@acme.example", "budget": 7500.0},
        {"email": "linus@initech.example", "budget": None},
    ]


@test("Trims names, parses dates, and renumbers the rows")
def _():
    cleaned = clean_leads(leads())
    assert cleaned["name"].tolist() == ["Grace Hopper", "Ada Lovelace", "Linus Torvalds"]
    assert cleaned["submitted_at"].tolist() == [
        pd.Timestamp("2026-09-02 14:00"), pd.Timestamp("2026-09-05 11:30"), pd.Timestamp("2026-09-07 16:45"),
    ]
    assert cleaned.index.tolist() == [0, 1, 2]


@test("Keeps the columns in their original order")
def _():
    assert list(clean_leads(leads()).columns) == ["name", "email", "company", "budget", "submitted_at"]


@hidden("Doesn't change the DataFrame it was given")
def _():
    original = leads()
    clean_leads(original)
    assert original.equals(leads())


@hidden("Keeps the latest submission even when it comes first in the export")
def _():
    shuffled = leads().iloc[[2, 0, 1]].reset_index(drop=True)
    cleaned = clean_leads(shuffled)
    assert records(cleaned, ["email", "budget"]) == [
        {"email": "grace@globex.example", "budget": 12000.0},
        {"email": "ada@acme.example", "budget": 7500.0},
    ]
