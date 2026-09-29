from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from plp import test, hidden
from solution import Application, Base, Company, Interview, delete_company, withdraw


def fresh_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = Session(engine)
    session.add_all([
        Company(name="Northwind", applications=[
            Application(role="Backend engineer", interviews=[
                Interview(scheduled_at=datetime(2026, 9, 14, 10), kind="phone screen"),
                Interview(scheduled_at=datetime(2026, 9, 21, 14), kind="technical"),
            ]),
            Application(role="SRE"),
        ]),
        Company(name="Globex", applications=[
            Application(role="Data engineer", interviews=[Interview(scheduled_at=datetime(2026, 9, 16, 11), kind="video")]),
        ]),
    ])
    session.commit()
    return session


def company(session, name):
    return session.scalars(select(Company).where(Company.name == name)).one()


def remaining(session, column):
    return sorted(session.scalars(select(column)))


@test("Deleting a company deletes its applications and their interviews")
def _():
    with fresh_session() as session:
        delete_company(session, company(session, "Northwind"))
        assert remaining(session, Company.name) == ["Globex"]
        assert remaining(session, Application.role) == ["Data engineer"]
        assert remaining(session, Interview.kind) == ["video"]


@test("Withdrawing an application deletes it and its interviews")
def _():
    with fresh_session() as session:
        northwind = company(session, "Northwind")
        backend = next(a for a in northwind.applications if a.role == "Backend engineer")
        withdraw(northwind, backend)
        session.commit()
        assert remaining(session, Application.role) == ["Data engineer", "SRE"]
        assert remaining(session, Interview.kind) == ["video"]


@test("Other companies are untouched")
def _():
    with fresh_session() as session:
        delete_company(session, company(session, "Globex"))
        assert remaining(session, Application.role) == ["Backend engineer", "SRE"]
        assert remaining(session, Interview.kind) == ["phone screen", "technical"]


@hidden("Deleting one interview through its application works too")
def _():
    with fresh_session() as session:
        globex = company(session, "Globex")
        application = globex.applications[0]
        application.interviews.clear()
        session.commit()
        assert remaining(session, Interview.kind) == ["phone screen", "technical"]
