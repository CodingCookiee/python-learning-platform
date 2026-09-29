from sqlalchemy import Column, ForeignKey, Integer, MetaData, String, Table, create_engine, text

from plp import test, hidden
from solution import schema_diff


def models():
    """What the code describes today."""
    metadata = MetaData()
    Table("companies", metadata, Column("id", Integer, primary_key=True), Column("name", String, nullable=False))
    Table(
        "applications", metadata,
        Column("id", Integer, primary_key=True),
        Column("company_id", ForeignKey("companies.id")),
        Column("role", String, nullable=False),
        Column("salary", Integer),
    )
    Table("interviews", metadata, Column("id", Integer, primary_key=True), Column("application_id", ForeignKey("applications.id")))
    return metadata


def database(*statements):
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
    return engine


LAST_MONTH = (
    "CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
    "CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER, role TEXT NOT NULL, notes TEXT)",
    "CREATE TABLE legacy_notes (id INTEGER PRIMARY KEY, body TEXT)",
)


@test("Lists the tables and columns to add and drop")
def _():
    assert schema_diff(database(*LAST_MONTH), models()) == [
        "add column applications.salary",
        "add table interviews",
        "drop column applications.notes",
        "drop table legacy_notes",
    ]


@test("An up-to-date database needs nothing")
def _():
    engine = create_engine("sqlite://")
    metadata = models()
    metadata.create_all(engine)
    assert schema_diff(engine, metadata) == []


@test("An empty database needs every table")
def _():
    assert schema_diff(create_engine("sqlite://"), models()) == ["add table applications", "add table companies", "add table interviews"]


@hidden("A renamed column shows up as a drop and an add")
def _():
    engine = database(
        "CREATE TABLE companies (id INTEGER PRIMARY KEY, title TEXT NOT NULL)",
        "CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER, role TEXT NOT NULL, salary INTEGER)",
        "CREATE TABLE interviews (id INTEGER PRIMARY KEY, application_id INTEGER)",
    )
    assert schema_diff(engine, models()) == ["add column companies.name", "drop column companies.title"]


@hidden("Ignores the alembic_version table")
def _():
    engine = create_engine("sqlite://")
    metadata = models()
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
    assert schema_diff(engine, metadata) == []
