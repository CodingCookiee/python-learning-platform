---
slug: orm-relationships-and-loading
title: Relationships, N+1 and eager loading
summary: See how lazy loading turns one page into a hundred queries, fix it with selectinload and joinedload, and model many-to-many links and cascading deletes.
minutes: 45
exercises:
  - orm-predict-lazy-queries
  - orm-fix-n-plus-one
  - orm-application-tags
  - orm-fix-cascade-delete
  - orm-interview-schedule
---

The companies page lists every company with how many applications you've sent there. With five
companies in your test database it's instant. With five hundred in production it takes a second
and a half, and the database log shows why: **501 queries** for one page. Nothing in the code
looks like a loop over the database. This lesson shows where those queries come from, how to see
them, and how to load related objects in one or two queries instead.

## Lazy loading: queries you didn't write

By default a relationship is **lazy**: `company.applications` isn't loaded with the company. The
first time you touch it, SQLAlchemy runs a `SELECT` to fetch it. That's convenient, and it's the
trap. Here's a query counter, built on SQLAlchemy's event hooks, watching a simple loop:

```python
from sqlalchemy import ForeignKey, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    applications: Mapped[list["Application"]] = relationship(back_populates="company")

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    company: Mapped[Company] = relationship(back_populates="applications")

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
with Session(engine) as session:
    for n in range(5):
        session.add(Company(name=f"Company {n}", applications=[Application(role="Engineer")]))
    session.commit()

queries = []
event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: queries.append(sql))

with Session(engine) as session:
    report = [(company.name, len(company.applications)) for company in session.scalars(select(Company))]

for sql in queries:
    print(sql.split("\n")[0], "...")
len(queries)
```

One query for the companies, then one more **per company** for its applications: **N+1**
queries. In SQLite in memory each one takes microseconds. Against PostgreSQL across a network each
one is a round trip of a millisecond or more, so the page slows down in step with the data, and the
tests, with their five rows, never notice.

`before_cursor_execute` fires for every statement sent to the database, which makes it the
simplest way to catch this: count queries in a test and assert on the number. `echo=True` on the
engine shows the same thing in a log.

## Eager loading: selectinload and joinedload

Tell the query up front which relationships you'll need, and SQLAlchemy loads them for every
object in one go. That's **eager loading**, added to a `select()` with `.options(...)`:

- `selectinload(Company.applications)` runs the main query, then **one** more:
  `SELECT ... FROM applications WHERE company_id IN (1, 2, 3, ...)`. Two queries, however many
  companies. The best default for collections (one-to-many and many-to-many).
- `joinedload(Application.company)` adds a `LEFT OUTER JOIN` to the main query, so it's one query.
  Best for the "one" side of a relationship (many-to-one), where the join doesn't multiply rows.

```python
from sqlalchemy import ForeignKey, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, joinedload, mapped_column, relationship, selectinload

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    applications: Mapped[list["Application"]] = relationship(back_populates="company")

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    company: Mapped[Company] = relationship(back_populates="applications")

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
with Session(engine) as session:
    for n in range(20):
        session.add(Company(name=f"Company {n}", applications=[Application(role="Engineer"), Application(role="SRE")]))
    session.commit()

queries = []
event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: queries.append(sql))

def count_queries(work):
    queries.clear()
    with Session(engine) as session:
        work(session)
    return len(queries)

# companies and their applications
lazy = count_queries(lambda s: [len(c.applications) for c in s.scalars(select(Company))])
selectin = count_queries(lambda s: [len(c.applications) for c in s.scalars(
    select(Company).options(selectinload(Company.applications)))])

# applications and their company
lazy_company = count_queries(lambda s: [a.company.name for a in s.scalars(select(Application))])
joined = count_queries(lambda s: [a.company.name for a in s.scalars(
    select(Application).options(joinedload(Application.company)))])

{"lazy": lazy, "selectinload": selectin, "lazy company": lazy_company, "joinedload": joined}
```

Twenty-one queries became two. Going the other way, from forty applications to their companies,
lazy loading ran twenty-one queries (each company once; the identity map answered the second
application of each company without asking), and `joinedload` needed one. The loop itself didn't change at all, which is the point: eager
loading is a decision you make where the query is built, for the code that will use the result.

> [!TIP]
> Set `lazy="raise"` on a relationship (`relationship(back_populates="company", lazy="raise")`)
> and touching it without eager loading raises an error instead of quietly querying. It turns
> every N+1 into a failing test.

When all you need is a number per company, don't load the objects at all. One `GROUP BY` query
returns exactly the report:

```python norun
stmt = (
    select(Company.name, func.count(Application.id))
    .outerjoin(Company.applications)
    .group_by(Company.id)
    .order_by(Company.name)
)
session.execute(stmt).all()
```

> [!JS]
> Coming from Prisma: `include: { applications: true }` is eager loading, and Prisma does it with
> a second `IN` query, like `selectinload`. TypeORM's `relations: [...]` and Drizzle's `with: {...}`
> are the same idea. SQLAlchemy is lazy unless you ask; Prisma is the other way round.

## Many-to-many

An application can have several skills tagged on it ("python", "sql", "aws"), and each tag belongs
to many applications. Neither table can hold the link, so a third **association table** holds one
row per pair. It's a plain `Table`, not a model, and `relationship(secondary=...)` goes through it:

```python
from sqlalchemy import Column, ForeignKey, Table, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

class Base(DeclarativeBase):
    pass

application_tags = Table(
    "application_tags",
    Base.metadata,
    Column("application_id", ForeignKey("applications.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]
    tags: Mapped[list["Tag"]] = relationship(secondary=application_tags, back_populates="applications")

class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    applications: Mapped[list[Application]] = relationship(secondary=application_tags, back_populates="tags")

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

with Session(engine) as session:
    python, sql, aws = Tag(name="python"), Tag(name="sql"), Tag(name="aws")
    session.add_all([
        Application(role="Backend engineer", tags=[python, sql]),
        Application(role="Data engineer", tags=[python, sql, aws]),
        Application(role="Platform engineer", tags=[aws]),
    ])
    session.commit()

    with_sql = session.scalars(
        select(Application.role).join(Application.tags).where(Tag.name == "sql").order_by(Application.role)
    ).all()
    link_rows = session.execute(select(application_tags)).all()
    python_roles = sorted(a.role for a in python.applications)

with_sql, len(link_rows), python_roles
```

Appending a tag to `application.tags` inserts a row into `application_tags` at flush; removing it
deletes that row. The two sides stay in step through `back_populates`, just like one-to-many.

When the link carries data of its own (an interview links an application to a stage **and** has a
date and an outcome), make it a full model with two foreign keys instead: an *association object*.
The Job tracker capstone does exactly that.

## Cascades: what happens to the children

Delete a company that has applications and, by default, SQLAlchemy doesn't delete them. It sets
their `company_id` to NULL, which a `NOT NULL` column refuses:

```python raises
from sqlalchemy import ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    applications: Mapped[list["Application"]] = relationship(back_populates="company")

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    company: Mapped[Company] = relationship(back_populates="applications")

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
with Session(engine) as session:
    northwind = Company(name="Northwind", applications=[Application(role="Backend engineer")])
    session.add(northwind)
    session.commit()
    session.delete(northwind)
    session.commit()
```

When the children can't exist without their parent, say so on the relationship:
`relationship(back_populates="company", cascade="all, delete-orphan")`. `all` makes deleting the
company delete its applications; `delete-orphan` also deletes an application that's removed from
`company.applications`. Leave it off where children should outlive their parent, such as tags,
which mustn't vanish because one application was deleted.

```quiz
question: "With cascade=\"all, delete-orphan\" on Company.applications, what does company.applications.remove(application) followed by a commit do?"
options:
  - Nothing is written until you call session.delete(application)
  - The application is deleted from the database
  - The application's company_id is set to NULL
answer: 1
explain: "An application removed from its company is an orphan, and delete-orphan deletes orphans at flush. Without it, SQLAlchemy would set company_id to NULL."
```

## Where this leaves you

Relationships are lazy: touching one runs a query, and doing that in a loop is the N+1 problem.
Count queries with a `before_cursor_execute` listener, then fix them where the query is built:
`selectinload` for collections, `joinedload` for many-to-one, or a `GROUP BY` when you only need
numbers. Many-to-many goes through an association table with `secondary=`, and `cascade="all,
delete-orphan"` makes children live and die with their parent. The drills have you count queries,
fix an N+1 loop and a delete that fails, and load a three-level chain in one query.
