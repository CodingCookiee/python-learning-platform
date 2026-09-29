from datetime import datetime

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from plp import test, hidden
from solution import Application, Base, Company, Interview, format_schedule, schedule


def fresh_engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        northwind = Company(name="Northwind")
        globex = Company(name="Globex")
        backend = Application(role="Backend engineer", company=northwind)
        sre = Application(role="SRE", company=northwind)
        data = Application(role="Data engineer", company=globex)
        session.add_all([
            Interview(scheduled_at=datetime(2026, 9, 16, 11, 30), kind="video", application=data),
            Interview(scheduled_at=datetime(2026, 9, 14, 10, 0), kind="phone screen", application=backend),
            Interview(scheduled_at=datetime(2026, 9, 21, 9, 0), kind="technical", application=backend),
            Interview(scheduled_at=datetime(2026, 9, 11, 15, 0), kind="phone screen", application=sre),
        ])
        session.commit()
    return engine


@test("Lists the week's interviews with company and role")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        week = schedule(session, datetime(2026, 9, 14), datetime(2026, 9, 21))
    assert format_schedule(week) == [
        "Mon 14 Sep 10:00  Northwind   Backend engineer    (phone screen)",
        "Wed 16 Sep 11:30  Globex      Data engineer       (video)",
    ]


@test("Takes one query, including the applications and companies")
def _():
    engine = fresh_engine()
    seen = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: seen.append(sql))
    with Session(engine) as session:
        week = schedule(session, datetime(2026, 9, 1), datetime(2026, 10, 1))
        format_schedule(week)
    assert len(seen) == 1, f"The schedule took {len(seen)} queries"


@test("Returns Interview objects, earliest first")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        interviews = schedule(session, datetime(2026, 9, 1), datetime(2026, 10, 1))
        assert all(isinstance(i, Interview) for i in interviews)
        assert [i.kind for i in interviews] == ["phone screen", "phone screen", "video", "technical"]


@hidden("Start is included and end is excluded")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        interviews = schedule(session, datetime(2026, 9, 14, 10, 0), datetime(2026, 9, 21, 9, 0))
        assert [i.scheduled_at for i in interviews] == [datetime(2026, 9, 14, 10, 0), datetime(2026, 9, 16, 11, 30)]


@hidden("An empty week formats to no lines")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        assert schedule(session, datetime(2026, 12, 1), datetime(2026, 12, 8)) == []
    assert format_schedule([]) == []
