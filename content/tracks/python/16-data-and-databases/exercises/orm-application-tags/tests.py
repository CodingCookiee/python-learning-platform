from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from plp import test, hidden
from solution import Application, Base, Tag, applications_tagged, tag_application


def fresh_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return Session(engine)


def sample(session):
    backend = Application(role="Backend engineer")
    data = Application(role="Data engineer")
    session.add_all([backend, data])
    tag_application(session, backend, "Python", "SQL")
    tag_application(session, data, "python", " AWS ")
    session.commit()
    return backend, data


def tag_count(session):
    return session.scalar(select(func.count()).select_from(Tag))


@test("Tags applications and finds them by tag")
def _():
    with fresh_session() as session:
        backend, data = sample(session)
        assert applications_tagged(session, "python") == ["Backend engineer", "Data engineer"]
        assert sorted(tag.name for tag in data.tags) == ["aws", "python"]


@test("Reuses an existing tag")
def _():
    with fresh_session() as session:
        sample(session)
        assert tag_count(session) == 3


@test("Tagging twice with the same name changes nothing")
def _():
    with fresh_session() as session:
        backend, _ = sample(session)
        tag_application(session, backend, "SQL", " python ")
        session.commit()
        assert sorted(tag.name for tag in backend.tags) == ["python", "sql"]
        assert tag_count(session) == 3


@hidden("Both sides of the relationship agree")
def _():
    with fresh_session() as session:
        sample(session)
        python = session.scalars(select(Tag).where(Tag.name == "python")).one()
        assert sorted(a.role for a in python.applications) == ["Backend engineer", "Data engineer"]


@hidden("The links are stored in the application_tags table")
def _():
    with fresh_session() as session:
        sample(session)
        from solution import application_tags
        assert session.scalar(select(func.count()).select_from(application_tags)) == 4


@hidden("An unknown tag finds nothing, and tagging doesn't commit")
def _():
    with fresh_session() as session:
        sample(session)
        assert applications_tagged(session, "rust") == []
        platform = Application(role="Platform engineer")
        session.add(platform)
        tag_application(session, platform, "Kubernetes")
        session.rollback()
        assert tag_count(session) == 3
