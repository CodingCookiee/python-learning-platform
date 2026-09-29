from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from plp import test, hidden, raises
from solution import Base, Company


def fresh_engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return engine


@test("Saves a company with the defaults")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        session.add(Company(name="Northwind"))
        session.commit()
        company = session.get(Company, 1)
        assert (company.name, company.website, company.remote_friendly) == ("Northwind", None, False)


@test("Stores a website and remote_friendly when given")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        session.add(Company(name="Globex", website="https://globex.example", remote_friendly=True))
        session.commit()
        company = session.get(Company, 1)
        assert (company.website, company.remote_friendly) == ("https://globex.example", True)


@test("Two companies can't share a name")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        session.add_all([Company(name="Initech"), Company(name="Initech")])
        raises(IntegrityError, session.commit)


@hidden("The columns have the right types and rules")
def _():
    columns = {c["name"]: c for c in inspect(fresh_engine()).get_columns("companies")}
    assert sorted(columns) == ["id", "name", "remote_friendly", "website"]
    assert columns["name"]["nullable"] is False
    assert columns["website"]["nullable"] is True
    assert columns["remote_friendly"]["nullable"] is False
    assert Company.__table__.c.name.type.length == 100


@hidden("A company must have a name")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        session.add(Company(website="https://nameless.example"))
        raises(IntegrityError, session.commit)
