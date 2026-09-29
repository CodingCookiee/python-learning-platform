---
slug: orm-models-and-sessions
title: SQLAlchemy models and sessions
summary: Describe tables as typed Python classes, save and change objects through a session's unit of work, and query them with select().
minutes: 45
exercises:
  - orm-company-model
  - orm-predict-identity-map
  - orm-add-and-find
  - orm-query-to-select
  - orm-invoice-lines
---

With raw `sqlite3`, every table means writing the same code four times: the `CREATE TABLE`, the
`INSERT` with its list of columns, the `UPDATE`, and the row factory that turns tuples back into
objects. Add a column and all four change. An **ORM** (object-relational mapper) lets you describe
each table once, as a Python class, and then work with objects: it writes the SQL and tracks what
changed. **SQLAlchemy** is the Python standard. This lesson uses its 2.0 API throughout, which is
what current documentation and new projects use.

## The engine: where the database is

Everything starts with an **engine**, made once per application from a database URL. It knows
which database and driver to use, and keeps a pool of connections ready:

```python
from sqlalchemy import create_engine, text

engine = create_engine("sqlite://")      # in memory; "sqlite:///jobs.db" for a file
with engine.connect() as conn:
    version = conn.execute(text("SELECT sqlite_version()")).scalar()
version
```

The URL is the only part that changes between databases:
`postgresql+psycopg://app:secret@db.internal:5432/jobs` uses PostgreSQL through the psycopg
driver, and the rest of your code stays the same. Keep the URL out of your source code (read it
from an environment variable or your settings) because it usually contains a password.

## Models: a class per table

A **model** is a class that describes one table. All your models inherit from one base class,
which you make by subclassing `DeclarativeBase`. Each column is a class attribute annotated with
`Mapped[...]`; the Python type decides the column type, and `mapped_column()` adds anything else:

```python
from sqlalchemy import String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.schema import CreateTable

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    city: Mapped[str | None]                  # Optional, so the column is nullable
    remote_friendly: Mapped[bool] = mapped_column(default=False)

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)              # CREATE TABLE for every model that's missing
print(CreateTable(Company.__table__).compile(engine))
```

- `Mapped[str]` means `NOT NULL`; `Mapped[str | None]` means the column can be NULL. The type hint
  is the schema, so mypy and the database agree.
- `mapped_column(primary_key=True)` on an `int` gives an auto-assigned id.
- `String(100)`, `unique=True`, `index=True` and `default=...` map onto what you wrote by hand in
  lesson 1.
- `Base.metadata` collects every model's table. `create_all` is right for tests and examples; a
  real application's schema changes through migrations (lesson 6).

> [!JS]
> Coming from Prisma, Drizzle or TypeORM: this is the `model Company { ... }` block, the
> `sqliteTable("companies", {...})` call, or the `@Entity()` class. The difference is that the
> class *is* the Python type you work with; there's no generated client.

## Sessions and the unit of work

You don't send `INSERT`s yourself. You hand objects to a **session**, which tracks every object
you've added, loaded or changed, and on **flush** writes all of it in the right order. That's the
**unit of work** pattern. `commit()` flushes and then commits the transaction.

```python
from sqlalchemy import String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    city: Mapped[str | None]

engine = create_engine("sqlite://", echo=True)     # echo logs every SQL statement
Base.metadata.create_all(engine)

with Session(engine) as session:
    northwind = Company(name="Northwind", city="Leeds")
    globex = Company(name="Globex")
    session.add_all([northwind, globex])
    print("before flush, id is", northwind.id)     # nothing has been sent yet

    session.commit()                                # INSERT, INSERT, COMMIT
    print("after commit, id is", northwind.id)

    northwind.city = "York"                         # just an attribute change...
    session.commit()                                # ...which the session turns into an UPDATE
```

Read the log: nothing reached the database until `commit()`, and the change to `city` became an
`UPDATE` without you writing one. Models get a keyword-only `__init__` for free, so
`Company(name="Northwind")` works without you writing a constructor.

`with Session(engine) as session:` closes the session at the end but doesn't commit. For a block
that commits on success and rolls back on an exception, like `with conn:` in lesson 3, use
`with Session(engine) as session, session.begin():`.

## One row, one object

Inside a session, each row is loaded into **exactly one** object. Ask for the same row twice, by
id or through a query, and you get the same object back. This is the **identity map**, and it's
why a change made through one reference is visible through every other:

```python
from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

with Session(engine) as session:
    session.add(Company(name="Northwind"))
    session.commit()

    by_id = session.get(Company, 1)
    by_query = session.scalars(select(Company).where(Company.name == "Northwind")).one()
    by_id.name = "Northwind Traders"                  # not flushed yet
    renamed = session.scalars(select(Company.name)).one()

by_id is by_query, renamed
```

The query returned the new name even though nothing was committed: before running a query, the
session **autoflushes** pending changes, so queries always see your own work.

```quiz
question: "Inside one session you call session.get(Company, 1) twice. How many Company objects exist?"
options:
  - "Two, one per call"
  - "One: both calls return the same object"
  - "None until you commit"
answer: 1
explain: "The identity map keeps one object per row per session. The second get() doesn't even query the database; it finds the object already loaded."
```

## Queries with select()

A query is a `select()` statement you build and then hand to the session. `session.scalars(stmt)`
returns model objects; `.all()`, `.first()`, `.one()` and `.one_or_none()` take them out.
`session.execute(stmt)` returns rows of plain values when you select columns instead of models:

```python
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

class Base(DeclarativeBase):
    pass

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company: Mapped[str]
    role: Mapped[str]
    status: Mapped[str] = mapped_column(default="applied")
    salary: Mapped[int | None]

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

with Session(engine) as session:
    session.add_all([
        Application(company="Northwind", role="Backend engineer", status="interview", salary=72000),
        Application(company="Globex", role="Data engineer", salary=68000),
        Application(company="Umbrella", role="Platform engineer", salary=80000),
        Application(company="Initech", role="Python developer", status="rejected"),
    ])
    session.commit()

    open_stmt = (
        select(Application)
        .where(Application.status.in_(["applied", "interview"]), Application.salary >= 70000)
        .order_by(Application.salary.desc())
    )
    print(open_stmt)                                          # the SQL it will run
    best = [(a.company, a.salary) for a in session.scalars(open_stmt)]
    per_status = session.execute(
        select(Application.status, func.count()).group_by(Application.status).order_by(Application.status)
    ).all()
    no_salary = session.scalars(select(Application.company).where(Application.salary.is_(None))).all()

best, per_status, no_salary
```

Everything from lessons 1 and 2 has a method: `.where()` (several conditions are joined with
`AND`), `.order_by()`, `.limit()`, `.group_by()`, `.having()`, `.join()`; columns have `.in_()`,
`.like()`, `.is_(None)` and `.desc()`; `func.count()`, `func.sum()` and friends are the aggregates.
Values are always sent as parameters, so injection can't happen. Printing a statement shows its SQL.

> [!WARNING]
> Tutorials and older code use `session.query(Company).filter_by(name="Globex").all()`. That's the
> 1.x **legacy** API. It still runs in 2.0, but new code uses `select()`, which works the same way
> with or without the ORM. Don't mix the two styles in one codebase.

## Relationships: one-to-many

A foreign key column plus a `relationship()` lets you move between objects: `company.applications`
is a list, and `application.company` is an object. `back_populates` names the attribute on the
other side, so the two stay in sync:

```python
from datetime import date

from sqlalchemy import ForeignKey, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    applications: Mapped[list["Application"]] = relationship(back_populates="company")

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    applied_on: Mapped[date]
    company: Mapped[Company] = relationship(back_populates="applications")

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

with Session(engine) as session:
    northwind = Company(name="Northwind")
    northwind.applications.append(Application(role="Backend engineer", applied_on=date(2026, 9, 1)))
    session.add(Application(role="SRE", applied_on=date(2026, 9, 9), company=northwind))
    session.add(northwind)
    session.commit()                        # company_id is filled in for both applications

    stmt = (
        select(Application.role, Application.applied_on)
        .join(Application.company)
        .where(Company.name == "Northwind")
        .order_by(Application.applied_on)
    )
    rows = session.execute(stmt).all()
    roles = [application.role for application in northwind.applications]

rows, roles
```

You never set `company_id` yourself: appending to `company.applications`, or setting
`application.company`, is enough, and the flush fills in the key. Adding the company also added its
applications, because a relationship cascades `add` by default. `Mapped[date]` becomes a `DATE`
column, stored as ISO text in SQLite and handed back as a real `date`.

## Where this leaves you

An engine knows where the database is. Models describe tables with `Mapped[...]` and
`mapped_column()`, and `Base.metadata.create_all()` creates them. A session is a unit of work: add
and change objects, and `commit()` writes the lot, in order, in one transaction; within a session,
each row is one object. Queries are `select()` statements run with `session.scalars()` or
`session.execute()`, and `relationship()` links models in both directions. The drills have you
write a model, predict what the identity map does, and move legacy queries to 2.0 style.
