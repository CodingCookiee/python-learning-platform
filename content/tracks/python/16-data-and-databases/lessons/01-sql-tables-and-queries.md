---
slug: sql-tables-and-queries
title: Tables and queries with sqlite3
summary: Create tables with constraints, insert rows, ask questions with SELECT, WHERE and ORDER BY, and turn rows into dataclasses.
minutes: 40
exercises:
  - sql-open-applications
  - sql-predict-null-filter
  - sql-create-invoices-table
  - sql-rows-to-dataclasses
  - sql-fix-recent-orders
---

You've been tracking job applications in a list of dicts, saved to JSON. It works until you ask
questions: "which applications have I heard nothing back from in two weeks?", "how many did I send
to each company?". Every question becomes a loop, and every loop loads the whole file. A database
stores the data once, answers questions you write in a few lines of SQL, and lets many programs
share the same data safely. Python ships with one built in.

## A database in one line

**SQLite** is a complete SQL database that runs inside your program as a library. There's no
server to install: a database is a single file, or, with the special name `":memory:"`, a
database that lives in memory and vanishes when the connection closes. The `sqlite3` module in the
standard library talks to it.

```python
import sqlite3

conn = sqlite3.connect(":memory:")    # or sqlite3.connect("jobs.db") for a file
conn.execute("SELECT sqlite_version(), 6 * 7").fetchone()
```

`connect()` returns a **connection**. `conn.execute(sql)` runs one statement and returns a
**cursor**, the object you read results from; `fetchone()` takes the next row, as a tuple.

Everything in this module's SQL works, with small changes, in PostgreSQL and MySQL too. SQLite is
where you learn it, and it's a fine production database for one machine: phones, desktop apps and
plenty of websites run on it.

## Creating a table

A **table** is a named set of rows that all have the same columns. You describe it once, with
`CREATE TABLE`, and the database enforces that description on every row from then on:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("""
    CREATE TABLE applications (
        id         INTEGER PRIMARY KEY,
        company    TEXT    NOT NULL,
        role       TEXT    NOT NULL,
        status     TEXT    NOT NULL DEFAULT 'applied'
                   CHECK (status IN ('applied', 'interview', 'offer', 'rejected')),
        salary     INTEGER,
        applied_on TEXT    NOT NULL
    )
""")
[column[1] for column in conn.execute("PRAGMA table_info(applications)")]
```

Each column has a type and optional **constraints**:

| Constraint | Means |
|------------|-------|
| `INTEGER PRIMARY KEY` | A unique id for each row, filled in automatically if you leave it out |
| `NOT NULL` | The column must have a value |
| `UNIQUE` | No two rows share a value |
| `DEFAULT 'applied'` | The value used when an insert leaves the column out |
| `CHECK (...)` | A condition every row must pass |

SQLite has few types: `INTEGER`, `REAL`, `TEXT` and `BLOB`. Store dates as ISO text
(`'2026-09-14'`), which sorts correctly as a string, and money as whole cents in an `INTEGER`, so
it never meets a float rounding error. Constraints are worth the typing: a rule in the schema
protects the data from every program that touches it, including the one you write next year.

```python raises
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("""
    CREATE TABLE applications (
        id      INTEGER PRIMARY KEY,
        company TEXT NOT NULL,
        status  TEXT NOT NULL CHECK (status IN ('applied', 'interview', 'offer', 'rejected'))
    )
""")
conn.execute("INSERT INTO applications (company, status) VALUES ('Acme', 'ghosted')")
```

The database refused the row with `sqlite3.IntegrityError`, before it was ever stored.

## Putting rows in

`INSERT INTO table (columns) VALUES (...)` adds a row. Values come from Python through
**placeholders**: write `?` in the SQL and pass the values as a tuple. `executemany` runs the same
statement once per tuple in a list:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL, applied_on TEXT NOT NULL)")

cursor = conn.execute(
    "INSERT INTO applications (company, role, applied_on) VALUES (?, ?, ?)",
    ("Northwind", "Backend engineer", "2026-09-01"),
)
first_id = cursor.lastrowid          # the id SQLite gave the new row

conn.executemany(
    "INSERT INTO applications (company, role, applied_on) VALUES (?, ?, ?)",
    [
        ("Globex", "Data engineer", "2026-09-03"),
        ("Initech", "Python developer", "2026-09-08"),
    ],
)
first_id, conn.execute("SELECT count(*) FROM applications").fetchone()
```

Never paste values into SQL with an f-string, even in a quick script. Lesson 3 shows exactly what
goes wrong; for now, the rule is: **values always go through `?`**.

> [!JS]
> Coming from JavaScript: it's the same `?` you'd write with `better-sqlite3`
> (`db.prepare("... ?").run(value)`) or `knex.raw("... ?", [value])`. The driver sends the values
> separately from the SQL.

## Asking questions: SELECT, WHERE, ORDER BY, LIMIT

`SELECT` reads rows. You say which columns you want, `FROM` which table, then optionally narrow and
order them. The clauses always come in this order:

```sql
SELECT columns FROM table WHERE condition ORDER BY columns LIMIT n
```

- `WHERE` keeps the rows whose condition is true. Combine conditions with `AND`, `OR` and
  `NOT`; test membership with `IN (...)`, ranges with `BETWEEN`, and patterns with `LIKE`
  (`%` matches any run of characters).
- `ORDER BY` sorts, ascending by default; add `DESC` to reverse, and list several columns to break
  ties.
- `LIMIT` keeps the first *n* rows after sorting.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT, role TEXT, status TEXT, salary INTEGER, applied_on TEXT)")
conn.executemany(
    "INSERT INTO applications (company, role, status, salary, applied_on) VALUES (?, ?, ?, ?, ?)",
    [
        ("Northwind", "Backend engineer", "interview", 72000, "2026-09-01"),
        ("Globex", "Data engineer", "applied", 68000, "2026-09-03"),
        ("Initech", "Python developer", "rejected", 61000, "2026-09-04"),
        ("Umbrella", "Platform engineer", "applied", 80000, "2026-09-08"),
        ("Hooli", "Backend engineer", "offer", 85000, "2026-09-10"),
    ],
)

rows = conn.execute("""
    SELECT company, salary
    FROM applications
    WHERE status IN ('applied', 'interview') AND salary >= 70000
    ORDER BY salary DESC
""").fetchall()
rows
```

`fetchall()` returns a list of tuples, one per row. A cursor is also iterable, so
`for company, salary in conn.execute(...)` reads rows one at a time without building the list.

Values in a `WHERE` clause go through placeholders too. The parameters are always a sequence, so
a single value needs the one-item tuple `(value,)`:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (company TEXT, role TEXT, status TEXT)")
conn.executemany("INSERT INTO applications VALUES (?, ?, ?)", [
    ("Northwind", "Backend engineer", "interview"),
    ("Globex", "Data engineer", "applied"),
])

status = "applied"
conn.execute("SELECT company, role FROM applications WHERE status = ?", (status,)).fetchall()
```

```quiz
question: "Which query returns the three most recent applications?"
options:
  - "SELECT * FROM applications LIMIT 3 ORDER BY applied_on DESC"
  - "SELECT * FROM applications ORDER BY applied_on DESC LIMIT 3"
  - "SELECT * FROM applications ORDER BY applied_on LIMIT 3"
answer: 1
explain: "LIMIT comes after ORDER BY (the first option is a syntax error), and newest first needs DESC. Without it, the third option returns the three oldest."
```

## NULL is not a value

A column without a value holds **NULL**, which means "unknown". SQL treats unknown carefully: any
comparison with NULL, even `NULL = NULL`, is itself unknown, and `WHERE` keeps only rows whose
condition is definitely true. So a row with a NULL salary is dropped by `salary > 0` **and** by
`salary <= 0`.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (company TEXT, status TEXT, salary INTEGER)")
conn.executemany("INSERT INTO applications VALUES (?, ?, ?)", [
    ("Northwind", "interview", 72000),
    ("Globex", None, None),          # imported from an old spreadsheet
    ("Initech", "rejected", 61000),
])

def companies(where):
    return [row[0] for row in conn.execute(f"SELECT company FROM applications WHERE {where}")]

{
    "salary = NULL": companies("salary = NULL"),
    "salary IS NULL": companies("salary IS NULL"),
    "status != 'rejected'": companies("status != 'rejected'"),
    "status IS NOT 'rejected'": companies("status IS NOT 'rejected'"),
}
```

(The f-string there builds different *SQL*, not values, from text the program wrote itself; that's
the one kind of string building lesson 3 allows.)

- Test for missing values with `IS NULL` and `IS NOT NULL`, never `= NULL`.
- `status != 'rejected'` silently drops the rows with no status. If they should count, write
  `status IS NOT 'rejected'` (SQLite) or `(status IS NULL OR status != 'rejected')`, which works
  everywhere.
- `COALESCE(salary, 0)` gives the first value that isn't NULL, for a default in the output.
- When sorting, SQLite puts NULLs **first** in ascending order.

> [!JS]
> Coming from JavaScript: NULL isn't `null`. `null === null` is true in JS, but `NULL = NULL` is
> NULL in SQL, which `WHERE` treats as false. It behaves more like `NaN`.

## Rows as tuples, rows as objects

Tuples are fine for two columns and error-prone for eight: `row[4]` says nothing about what it is.
Set the connection's **row factory** to `sqlite3.Row` and rows can be read by column name as well
as position. `sqlite3.Row` also has `keys()`, so `dict(row)` works:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT, role TEXT)")
conn.execute("INSERT INTO applications (company, role) VALUES ('Northwind', 'Backend engineer')")

row = conn.execute("SELECT id, company, role FROM applications").fetchone()
row["company"], row[2], row.keys(), dict(row)
```

The rest of your program shouldn't care that the data came from SQL, so map rows into a
**dataclass** at the edge. A row factory is any function taking `(cursor, row)`, where `row` is the
tuple, and `cursor.description` names the columns. Setting it on a cursor, rather than the
connection, keeps the change local to one query:

```python
import sqlite3
from dataclasses import dataclass

@dataclass
class Application:
    id: int
    company: str
    role: str

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT, role TEXT)")
conn.executemany("INSERT INTO applications (company, role) VALUES (?, ?)",
                 [("Northwind", "Backend engineer"), ("Globex", "Data engineer")])

cursor = conn.cursor()
cursor.row_factory = lambda cur, row: Application(*row)
cursor.execute("SELECT id, company, role FROM applications ORDER BY company").fetchall()
```

`Application(*row)` relies on the columns coming back in the same order as the fields, which is
why the query names its columns instead of using `SELECT *`. For a column order that doesn't match,
use `sqlite3.Row` and `Application(**dict(row))`.

> [!TIP]
> `SELECT *` is handy at the REPL and fragile in code: add a column to the table and every
> `Application(*row)` breaks. Name the columns you need.

## Where this leaves you

A connection runs SQL; a cursor hands back rows. `CREATE TABLE` defines columns and the
constraints that protect them, `INSERT` takes values through `?` placeholders, and `SELECT ... WHERE
... ORDER BY ... LIMIT` asks questions. NULL means unknown: test it with `IS NULL`, and watch for
`!=` quietly dropping it. Row factories turn tuples into rows you can read by name, or straight into
dataclasses. The drills have you write each piece, and find a query that loses rows.
