from datetime import date, timedelta

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from plp import test, hidden
from solution import Application, Base, Company, company_report


def fresh_engine(companies):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all(companies)
        session.commit()
    return engine


def sample():
    return [
        Company(name="Northwind", applications=[
            Application(role="Backend engineer", applied_on=date(2026, 9, 1)),
            Application(role="SRE", applied_on=date(2026, 9, 9)),
        ]),
        Company(name="Initech"),
        Company(name="Globex", applications=[Application(role="Data engineer", applied_on=date(2026, 9, 3))]),
    ]


def many(count):
    start = date(2026, 1, 1)
    return [
        Company(name=f"Company {n:03d}", applications=[
            Application(role=f"Role {n}-{k}", applied_on=start + timedelta(days=n + k)) for k in range(n % 4)
        ])
        for n in range(count)
    ]


def queries_during(engine, work):
    seen = []
    listener = lambda conn, cursor, sql, *rest: seen.append(sql)
    event.listen(engine, "before_cursor_execute", listener)
    try:
        with Session(engine) as session:
            result = work(session)
    finally:
        event.remove(engine, "before_cursor_execute", listener)
    return result, seen


@test("Reports each company's applications and latest role")
def _():
    engine = fresh_engine(sample())
    with Session(engine) as session:
        assert company_report(session) == [("Globex", 1, "Data engineer"), ("Initech", 0, None), ("Northwind", 2, "SRE")]


@test("Takes at most two queries for 30 companies")
def _():
    engine = fresh_engine(many(30))
    report, seen = queries_during(engine, company_report)
    assert len(report) == 30
    assert len(seen) <= 2, f"The report sent {len(seen)} queries; it should need at most 2"


@hidden("Returns the same report as before for many companies")
def _():
    engine = fresh_engine(many(12))
    with Session(engine) as session:
        report = company_report(session)
    assert report[0] == ("Company 000", 0, None)
    assert report[3] == ("Company 003", 3, "Role 3-2")
    assert [row[1] for row in report] == [n % 4 for n in range(12)]


@hidden("Two queries even for 100 companies")
def _():
    engine = fresh_engine(many(100))
    _, seen = queries_during(engine, company_report)
    assert len(seen) <= 2, f"The report sent {len(seen)} queries"
