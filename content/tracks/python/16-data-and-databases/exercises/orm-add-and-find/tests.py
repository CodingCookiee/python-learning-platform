from datetime import date

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from plp import test, hidden
from solution import Application, Base, Company, add_application, applications_at


def fresh_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return Session(engine)


def companies(session):
    return session.scalar(select(func.count()).select_from(Company))


@test("Adds two applications at one company and lists their roles")
def _():
    with fresh_session() as session:
        add_application(session, "Northwind", "Backend engineer", date(2026, 9, 1))
        add_application(session, "Northwind", "SRE", date(2026, 9, 9))
        assert applications_at(session, "Northwind") == ["Backend engineer", "SRE"]


@test("Reuses a company instead of storing it twice")
def _():
    with fresh_session() as session:
        add_application(session, "Northwind", "Backend engineer", date(2026, 9, 1))
        add_application(session, "Northwind", "SRE", date(2026, 9, 9))
        add_application(session, "Globex", "Data engineer", date(2026, 9, 3))
        assert companies(session) == 2


@test("Returns the new application, linked to its company")
def _():
    with fresh_session() as session:
        application = add_application(session, "Globex", "Data engineer", date(2026, 9, 3))
        assert isinstance(application, Application)
        assert (application.company.name, application.role, application.applied_on) == ("Globex", "Data engineer", date(2026, 9, 3))


@hidden("Doesn't commit: the caller can roll it all back")
def _():
    with fresh_session() as session:
        add_application(session, "Northwind", "Backend engineer", date(2026, 9, 1))
        session.rollback()
        assert companies(session) == 0


@hidden("Finds a company that was committed earlier")
def _():
    with fresh_session() as session:
        session.add(Company(name="Initech"))
        session.commit()
        add_application(session, "Initech", "Python developer", date(2026, 9, 4))
        session.commit()
        assert companies(session) == 1
        assert applications_at(session, "Initech") == ["Python developer"]


@hidden("Lists roles oldest first, and nothing for an unknown company")
def _():
    with fresh_session() as session:
        add_application(session, "Hooli", "SRE", date(2026, 9, 20))
        add_application(session, "Hooli", "Backend engineer", date(2026, 9, 2))
        add_application(session, "Globex", "Data engineer", date(2026, 9, 3))
        assert applications_at(session, "Hooli") == ["Backend engineer", "SRE"]
        assert applications_at(session, "Umbrella") == []
