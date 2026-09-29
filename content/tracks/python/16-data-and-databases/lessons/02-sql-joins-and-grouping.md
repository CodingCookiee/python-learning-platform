---
slug: sql-joins-and-grouping
title: Joins, grouping and indexes
summary: Link tables with foreign keys, combine them with JOIN and LEFT JOIN, summarise with GROUP BY and HAVING, and keep lookups fast with indexes.
minutes: 45
exercises:
  - sql-predict-join-counts
  - sql-applications-per-company
  - sql-predict-group-having
  - sql-loop-to-group-by
  - sql-top-customers
  - sql-index-the-lookups
---

Last lesson's table stored the company name on every application. Apply to Northwind three times
and "Northwind" is typed three times; the day it becomes "Northwind Traders", you update three
rows and hope you found them all. Real schemas split data into several tables and link them. This
lesson is about asking questions across those tables, summarising them, and keeping those questions
fast as the data grows.

## Splitting data across tables

Each company is stored **once**, in `companies`, and each application points at its company by
id. That pointer is a **foreign key**: a column whose values must be ids from another table.

```sql
CREATE TABLE companies (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT
);
CREATE TABLE applications (
    id         INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    role       TEXT NOT NULL,
    status     TEXT NOT NULL
);
```

Renaming a company is now one `UPDATE` on one row. SQLite only enforces `REFERENCES` once you turn
it on per connection with `PRAGMA foreign_keys = ON` (PostgreSQL always enforces it), and with it
on, an application for a company that doesn't exist is refused:

```python raises
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies (id), role TEXT)")
conn.execute("INSERT INTO companies (id, name) VALUES (1, 'Northwind')")
conn.execute("INSERT INTO applications (company_id, role) VALUES (1, 'Backend engineer')")   # fine
conn.execute("INSERT INTO applications (company_id, role) VALUES (7, 'Data engineer')")      # no company 7
```

## JOIN: rows from two tables at once

`JOIN ... ON` pairs rows from two tables wherever the `ON` condition is true. Each application
finds its company, and the result has columns from both. Short aliases (`a`, `c`) keep the
column names readable:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
    CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT, status TEXT);
    INSERT INTO companies VALUES (1, 'Northwind', 'Leeds'), (2, 'Globex', 'Bristol'), (3, 'Initech', 'Leeds');
    INSERT INTO applications (company_id, role, status) VALUES
        (1, 'Backend engineer', 'interview'),
        (1, 'Platform engineer', 'applied'),
        (2, 'Data engineer', 'rejected');
""")

conn.execute("""
    SELECT c.name, a.role, a.status
    FROM applications AS a
    JOIN companies AS c ON c.id = a.company_id
    ORDER BY c.name, a.role
""").fetchall()
```

`executescript` runs several statements separated by semicolons, which is handy for setting up
examples (it takes no parameters, so never feed it values). Notice that Initech is missing: a
plain `JOIN` (also called `INNER JOIN`) keeps only rows that found a partner.

## LEFT JOIN keeps rows with no match

`LEFT JOIN` keeps **every** row from the left-hand table. Where there's no match on the right,
the right-hand columns are NULL. That's how you find things that *don't* have something: every
company with no application is a company whose application columns came back NULL.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT);
    INSERT INTO companies VALUES (1, 'Northwind'), (2, 'Globex'), (3, 'Initech');
    INSERT INTO applications (company_id, role) VALUES (1, 'Backend engineer'), (1, 'Platform engineer'), (2, 'Data engineer');
""")

everything = conn.execute("""
    SELECT c.name, a.role FROM companies AS c
    LEFT JOIN applications AS a ON a.company_id = c.id
    ORDER BY c.name, a.role
""").fetchall()

not_applied = conn.execute("""
    SELECT c.name FROM companies AS c
    LEFT JOIN applications AS a ON a.company_id = c.id
    WHERE a.id IS NULL
""").fetchall()

everything, not_applied
```

Count the rows a join returns before you trust any total built on it. Joining one company to its
two applications gives two rows, so the company appears twice. Join it to three interview notes as
well and you get two × three = six rows, and a `SUM` over them counts everything several times.

```quiz
question: "Northwind has 2 applications and Globex has 1. Initech has none. How many rows does companies LEFT JOIN applications return?"
options:
  - "3"
  - "4"
  - "2"
answer: 1
explain: "Two rows for Northwind, one for Globex, and one for Initech with NULLs in the application columns. A plain JOIN would return 3."
```

## GROUP BY: one row per group

**Aggregate functions** collapse many rows into one value: `count(*)` counts rows,
`count(column)` counts the values that aren't NULL, and `sum`, `avg`, `min` and `max` do what they
say. `GROUP BY` splits the rows into groups first and gives one output row per group:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, salary INTEGER);
    INSERT INTO companies VALUES (1, 'Northwind'), (2, 'Globex'), (3, 'Initech');
    INSERT INTO applications (company_id, salary) VALUES (1, 72000), (1, 80000), (2, NULL);
""")

conn.execute("""
    SELECT c.name, count(*) AS rows_in_group, count(a.id) AS applications, max(a.salary) AS best_offer
    FROM companies AS c
    LEFT JOIN applications AS a ON a.company_id = c.id
    GROUP BY c.id
    ORDER BY applications DESC, c.name
""").fetchall()
```

Look at Initech: `count(*)` says 1, because the LEFT JOIN gave it one row of NULLs, while
`count(a.id)` correctly says 0. Count a column from the right-hand table whenever you count
through a LEFT JOIN.

The rule for `SELECT` with `GROUP BY`: every column you select is either one you grouped by or
inside an aggregate. (SQLite lets you break it and quietly picks a value from some row;
PostgreSQL refuses the query. Don't rely on SQLite here.)

> [!JS]
> Coming from JavaScript: `GROUP BY` is the `Object.groupBy(rows, r => r.companyId)` followed by
> a `reduce` per group, done inside the database, so only the summary crosses the wire.

## HAVING filters groups

`WHERE` filters **rows**, before they're grouped. `HAVING` filters **groups**, after the
aggregates are computed, so it's the only place you can say "companies with at least two
applications":

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, status TEXT, total_cents INTEGER);
    INSERT INTO orders (customer, status, total_cents) VALUES
        ('Acme', 'paid', 42000), ('Acme', 'paid', 18000), ('Acme', 'refunded', 90000),
        ('Globex', 'paid', 75000), ('Initech', 'paid', 12000), ('Initech', 'paid', 9000);
""")

conn.execute("""
    SELECT customer, count(*) AS orders, sum(total_cents) AS revenue
    FROM orders
    WHERE status = 'paid'
    GROUP BY customer
    HAVING sum(total_cents) >= 50000
    ORDER BY revenue DESC
""").fetchall()
```

The refunded order was removed by `WHERE` before Acme's total was summed; Initech's group was
removed by `HAVING` afterwards. A database evaluates a query in this order, which is why an alias
defined in `SELECT` can be used in `ORDER BY` but not in `WHERE`:

`FROM` and `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`

```quiz
question: "You want customers whose paid orders total over 500. Which clause holds sum(total) > 500?"
options:
  - WHERE
  - HAVING
  - ORDER BY
answer: 1
explain: "sum(total) only exists once rows are grouped, and WHERE runs before grouping. HAVING filters the groups; status = 'paid' still belongs in WHERE."
```

## Indexes: why lookups stay fast

To answer `WHERE customer_id = ?`, a database with no help reads every row and checks it: a
**scan**. With a thousand rows nobody notices; with ten million, every page load waits. An
**index** is a separate sorted structure (a B-tree) of one or more columns, with a pointer to each
row, so the database can jump straight to the matching rows: a **search**.

`EXPLAIN QUERY PLAN` asks the database how it *would* run a query, without running it:

```python
import sqlite3
import time

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER)")
conn.executemany("INSERT INTO orders (customer_id, total_cents) VALUES (?, ?)",
                 ((n % 5000, n) for n in range(50_000)))

query = "SELECT sum(total_cents) FROM orders WHERE customer_id = ?"

def plan():
    return [row[3] for row in conn.execute("EXPLAIN QUERY PLAN " + query, (42,))]

def time_lookups():
    started = time.perf_counter()
    for customer_id in range(200):
        conn.execute(query, (customer_id,)).fetchone()
    return round(time.perf_counter() - started, 3)

before = plan(), time_lookups()
conn.execute("CREATE INDEX idx_orders_customer ON orders (customer_id)")
after = plan(), time_lookups()
before, after
```

`SCAN orders` became `SEARCH orders USING INDEX idx_orders_customer (customer_id=?)`, and the same
200 lookups got many times faster. Some rules of thumb:

- Index the columns you filter on, join on and sort by, especially foreign keys like
  `company_id`. SQLite doesn't index foreign keys for you.
- `PRIMARY KEY` and `UNIQUE` columns already have an index.
- An index on `(customer_id, placed_on)` serves `WHERE customer_id = ? ORDER BY placed_on` in one
  go. It also serves `WHERE customer_id = ?` alone, but not `WHERE placed_on = ?` alone: the
  leftmost columns have to be used.
- Indexes aren't free. Every insert and update maintains them, and they take space. Add them for
  the queries you actually run, and check with `EXPLAIN QUERY PLAN`.

> [!JS]
> Coming from Prisma or Drizzle: `@@index([customerId])` or `index("idx").on(t.customerId)` emits
> exactly this `CREATE INDEX` in a migration.

## Where this leaves you

Foreign keys link tables so each fact is stored once. `JOIN` combines matching rows, `LEFT JOIN`
keeps the unmatched ones with NULLs, and joins can multiply rows. `GROUP BY` with aggregates gives
one row per group, `WHERE` filters rows before grouping and `HAVING` filters groups after, and
`count(column)` ignores NULLs where `count(*)` doesn't. Indexes turn scans into searches, and
`EXPLAIN QUERY PLAN` shows which one you're getting. The drills start with predicting row counts
and end with making a slow lookup use an index.
