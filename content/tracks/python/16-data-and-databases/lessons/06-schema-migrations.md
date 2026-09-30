---
slug: schema-migrations
title: Migrations with Alembic
summary: Why create_all can't change a live database, how numbered migrations can, what SQLite lets you alter, and a local lab with Alembic's autogenerate.
minutes: 35
exercises:
  - orm-predict-create-all
  - sql-fix-rename-migration
  - sql-migration-runner
  - orm-schema-diff
lab:
  title: Three Alembic migrations
  kind: output
  instructions: >-
    After the rename migration in step 6 is upgraded, run the command below in the jobtracker
    folder and paste its output. It should list at least three revisions, starting from "create
    tables", with the newest one current.
  command: uv run alembic history; uv run alembic current
  patterns:
    - '<base> -> [0-9a-f]{12}, create tables'
    - '^[0-9a-f]{12} -> [0-9a-f]{12}, '
    - '^[0-9a-f]{12} -> [0-9a-f]{12} \(head\), '
    - '^[0-9a-f]{12} \(head\)\s*$'
---

The job tracker has been running for a month, with real data in it. You add a `salary` column to
the `Application` model, the tests pass (they build a fresh database every time), and you deploy.
Every page now fails with `no such column: applications.salary`. The model changed; the database
didn't. Nothing changes a database that already exists except a **migration**, and this lesson is
about writing them safely.

## create_all doesn't change existing tables

`Base.metadata.create_all()` creates the tables that are **missing**. A table that already exists
is left exactly as it is, even when the model now describes something different. Here are two
versions of the same model run against one database:

```python raises
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

engine = create_engine("sqlite://")

class VersionOne(DeclarativeBase):
    pass

class ApplicationV1(VersionOne):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]

class VersionTwo(DeclarativeBase):
    pass

class ApplicationV2(VersionTwo):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]
    salary: Mapped[int | None]           # new in version two

VersionOne.metadata.create_all(engine)   # last month's deploy
with engine.begin() as conn:
    conn.execute(text("INSERT INTO applications (role) VALUES ('Backend engineer')"))

VersionTwo.metadata.create_all(engine)   # today's deploy: nothing happens
print([column["name"] for column in inspect(engine).get_columns("applications")])

with engine.connect() as conn:
    conn.execute(text("SELECT role, salary FROM applications"))
```

You can't drop the table and recreate it either: that deletes a month of applications. The change
has to be made **to** the existing table, with its data in place: `ALTER TABLE applications ADD
COLUMN salary INTEGER`. A migration is that statement, written down, numbered and kept with the
code.

## A migration is a numbered, one-way step

A migration system has three parts:

1. Each schema change is a script (a **migration**) with a place in a sequence: 0001 creates the
   tables, 0002 adds `salary`, 0003 adds an index. They live in git next to the models.
2. The database records which migrations it has already had.
3. Deploying runs the missing ones, in order, before the new code starts.

Every copy of the database, from your laptop to production, then goes through exactly the same
steps and ends up with the same schema. SQLite has a spare integer in its file header for
recording a version, `PRAGMA user_version`, which is enough to build a small migration runner
(one of this lesson's drills):

```python
import sqlite3

conn = sqlite3.connect(":memory:")
before = conn.execute("PRAGMA user_version").fetchone()[0]
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, role TEXT NOT NULL)")
conn.execute("PRAGMA user_version = 1")     # PRAGMA takes no parameters, so the number is written in
after = conn.execute("PRAGMA user_version").fetchone()[0]
before, after
```

A migration must be **all or nothing**: if step two of three fails, the database mustn't be left
half-changed with a version number that says otherwise. SQLite (like PostgreSQL) can roll back
`CREATE` and `ALTER` statements, but `sqlite3` only opens a transaction for you before `INSERT`,
`UPDATE` and `DELETE`. For schema changes, start one yourself with `BEGIN`:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, role TEXT NOT NULL)")

conn.execute("BEGIN")
try:
    conn.execute("ALTER TABLE applications ADD COLUMN salary INTEGER")
    conn.execute("CREATE INDEX idx_applications_salary ON applications (salry)")   # a typo
    conn.commit()
except sqlite3.OperationalError as error:
    conn.rollback()
    print("Rolled back:", error)

[column[1] for column in conn.execute("PRAGMA table_info(applications)")]
```

The `ALTER TABLE` that did succeed was rolled back with the rest, so the table is exactly as it
was, ready for a corrected migration.

## What a live table lets you change

Some changes are easy, and some need care because rows already exist:

- **Adding a nullable column** is always safe: existing rows get NULL.
- **Adding a `NOT NULL` column** fails if existing rows would have nothing in it. Give it a
  `DEFAULT`, or add it nullable, fill it in with an `UPDATE` (a **backfill**), and only then make
  it required.
- **Renaming** is `ALTER TABLE ... RENAME COLUMN old TO new`, which keeps the data. Dropping the
  old column and adding a new one loses it.
- SQLite can't change a column's type or constraints in place. The workaround is to create the
  new table, copy the rows across, drop the old table and rename the new one. Alembic's "batch
  mode" does that dance for you.

```python raises
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, role TEXT NOT NULL)")
conn.execute("INSERT INTO applications (role) VALUES ('Backend engineer')")
conn.execute("ALTER TABLE applications ADD COLUMN source TEXT NOT NULL")
```

With `DEFAULT 'job board'` on the end, the same statement works, and a follow-up
`UPDATE applications SET source = 'referral' WHERE ...` corrects the rows that should differ.

> [!TIP]
> On a service that can't stop while it deploys, old and new code run side by side for a while.
> Change the schema in steps each version can live with ("expand, then contract"): add the new
> column, write to both, backfill, switch reads over, and drop the old column in a later release.

## Alembic: migrations for SQLAlchemy

**Alembic** is the migration tool from SQLAlchemy's authors. It keeps migrations as Python files in
a `migrations/versions/` folder, records the current one in an `alembic_version` table, and can
**autogenerate** a migration by comparing your models' metadata with the live database. Here's
what it writes after you add `salary` to the model:

```python norun
"""add salary to applications

Revision ID: 3f9c2a1b7d4e
Revises: 8a1e44c0b2f9
"""
from alembic import op
import sqlalchemy as sa

revision = "3f9c2a1b7d4e"
down_revision = "8a1e44c0b2f9"


def upgrade() -> None:
    op.add_column("applications", sa.Column("salary", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "salary")
```

`upgrade()` moves the schema forward and `downgrade()` undoes it; `down_revision` links each file
to the one before, so Alembic knows the order. Autogenerate compares tables, columns, types,
nullability, indexes and foreign keys, which covers most day-to-day changes. What it can't know:

- **Renames.** A renamed column looks like one column dropped and another added, and that's the
  migration it writes. Run it and the data in that column is gone. Replace the pair with
  `op.alter_column("applications", "company", new_column_name="employer")`.
- **Data changes.** Backfilling a new column, or splitting one column into two, is an
  `op.execute("UPDATE ...")` you write yourself.
- Some constraint and default changes, depending on the database.

So autogenerate writes a **draft**. Read every migration before you commit it, as carefully as you'd
read code, because it is code that runs once against your only copy of the data.

> [!JS]
> Coming from Prisma: `alembic revision --autogenerate` is `prisma migrate dev --create-only`,
> and `alembic upgrade head` is `prisma migrate deploy`. Drizzle Kit's `generate` and `migrate`
> are the same pair. Prisma asks about renames interactively; Alembic just writes drop-and-add.

```quiz
question: "You renamed Application.company to Application.employer and autogenerated a migration. What will it contain?"
options:
  - An alter_column that renames company to employer
  - A drop_column for company and an add_column for employer
  - Nothing, because the column's type didn't change
answer: 1
explain: "Autogenerate compares names, so it sees one column gone and a new one appear. Running that as written deletes the data; edit it into op.alter_column(..., new_column_name=\"employer\")."
```

## Do it on your machine

Alembic needs a real database file and a terminal, so this part runs locally.

1. Make a project: `uv init jobtracker`, `cd jobtracker`, `uv add sqlalchemy alembic`. Put a
   `models.py` in it with a `Base` and a `Company` and `Application` model from lesson 5.
2. Run `uv run alembic init migrations`. In `alembic.ini`, set
   `sqlalchemy.url = sqlite:///jobs.db`. In `migrations/env.py`, import your `Base` and set
   `target_metadata = Base.metadata`, and pass `render_as_batch=True` to both
   `context.configure(...)` calls (it lets Alembic alter SQLite tables).
3. `uv run alembic revision --autogenerate -m "create tables"`, read the file it wrote in
   `migrations/versions/`, then `uv run alembic upgrade head`. Check the result with
   `sqlite3 jobs.db .schema`, and notice the `alembic_version` table.
4. Add a nullable `salary: Mapped[int | None]` to `Application`. Autogenerate again, read it, upgrade.
   `uv run alembic current` and `uv run alembic history` show where you are.
5. Run `uv run alembic downgrade -1`, check `.schema` again (the column is gone), and upgrade back.
6. Rename a column in the model and autogenerate. Find the drop-and-add, and change it into an
   `op.alter_column(..., new_column_name=...)` before upgrading. Insert a row first, and check it
   survives.
7. **Check it:** paste the output of `uv run alembic history; uv run alembic current` into the lab
   box below.

## Where this leaves you

`create_all` creates missing tables and never alters existing ones, so a live database changes
only through migrations: numbered, all-or-nothing steps kept in git and recorded in the database.
Adding nullable columns is easy; required columns need a default or a backfill; renames must be
renames. Alembic autogenerates a draft of each migration from your models, and you read and fix
it, especially renames and data changes, before it runs. The drills have you predict `create_all`,
fix a migration that would lose data, build a small runner, and write the comparison autogenerate
makes.
