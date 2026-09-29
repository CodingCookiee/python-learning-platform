---
slug: sql-parameters-and-transactions
title: Safe queries and transactions
summary: See SQL injection happen and make it impossible with parameters, then make multi-step writes all-or-nothing with transactions.
minutes: 45
exercises:
  - sql-fix-injection-login
  - sql-safe-sort-column
  - sql-predict-with-connection
  - sql-fix-missing-commit
  - sql-reserve-stock
  - sql-import-payments
---

Two bugs in database code survive every happy-path test and then cost someone a very bad day. The
first lets a user's input become part of your SQL. The second writes half of a change: the payment
is recorded but the invoice still says unpaid. This lesson shows both happening, then removes them
for good.

## How SQL injection works

Here's a login check that builds its query with an f-string. With normal input it works fine:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, is_admin INTEGER)")
conn.executemany("INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)", [
    ("admin@example.com", "9f86d081884c7d65", 1),
    ("ada@example.com", "5e884898da280471", 0),
])

def log_in(email, password_hash):
    sql = f"SELECT id, email FROM users WHERE email = '{email}' AND password_hash = '{password_hash}'"
    print(sql)
    return conn.execute(sql).fetchone()

log_in("ada@example.com", "5e884898da280471")
```

Now an attacker types an email that ends a string early and comments out the rest of the query
with `--`:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, is_admin INTEGER)")
conn.executemany("INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)", [
    ("admin@example.com", "9f86d081884c7d65", 1),
    ("ada@example.com", "5e884898da280471", 0),
])

def log_in(email, password_hash):
    sql = f"SELECT id, email FROM users WHERE email = '{email}' AND password_hash = '{password_hash}'"
    print(sql)
    return conn.execute(sql).fetchone()

log_in("admin@example.com' --", "anything at all")
```

They're logged in as the administrator without a password. The input wasn't treated as a value; it
was pasted into the program the database runs, and it changed that program. That is **SQL
injection**, and it has been near the top of every web security list for twenty years. Variations
read other tables (`' UNION SELECT ...`), and with drivers that run several statements at once,
delete them. It doesn't need an attacker, either: a customer called O'Brien breaks the same query
with a syntax error.

> [!WARNING]
> `%` formatting, `.format()` and `+` are exactly as dangerous as f-strings. Any way of building SQL
> *text* out of a *value* is the bug.

## Parameters fix it completely

With a placeholder, the SQL and the values travel to the database **separately**. The database
parses the query first, with `?` as holes, then drops the values into the holes. A value can never
become SQL, whatever characters it contains:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT)")
conn.executemany("INSERT INTO users (email, password_hash) VALUES (?, ?)", [
    ("admin@example.com", "9f86d081884c7d65"),
    ("o'brien@example.com", "5e884898da280471"),
])

def log_in(email, password_hash):
    return conn.execute(
        "SELECT id, email FROM users WHERE email = ? AND password_hash = ?",
        (email, password_hash),
    ).fetchone()

log_in("admin@example.com' --", "anything at all"), log_in("o'brien@example.com", "5e884898da280471")
```

The attack now looks for a user whose email really is `admin@example.com' --`, and finds nobody.
O'Brien logs in fine. `sqlite3` also accepts **named** placeholders, which read better once a query
has several values: write `:name` in the SQL and pass a dict.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE invoices (number TEXT, customer TEXT, amount_cents INTEGER)")
invoice = {"number": "INV-0042", "customer": "Acme", "amount_cents": 125000}
conn.execute("INSERT INTO invoices VALUES (:number, :customer, :amount_cents)", invoice)
conn.execute("SELECT * FROM invoices WHERE customer = :customer", {"customer": "Acme"}).fetchall()
```

> [!JS]
> Coming from JavaScript: this is `pg`'s `client.query("... $1", [email])` or knex's `?`
> bindings. Tagged templates like Drizzle's `` sql`... ${email}` `` parameterise for you; a Python
> f-string never does. It's plain string building.

Placeholder syntax varies by driver: `sqlite3` uses `?` and `:name`, while `psycopg` (PostgreSQL)
uses `%s` and `%(name)s`. That `%s` is a placeholder the driver handles, **not** Python's `%`
operator: `cursor.execute("... %s", (email,))` is safe, and `cursor.execute("... %s" % email)` is
the bug.

## What parameters can't do

A placeholder stands for a **value**. It can't stand for a table name, a column name, a keyword like
`DESC`, or a variable number of values. When a user chooses the sort column, don't paste their text
in: map the choices you allow onto SQL you wrote yourself, and refuse everything else.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT, applied_on TEXT)")
conn.executemany("INSERT INTO applications (company, applied_on) VALUES (?, ?)",
                 [("Northwind", "2026-09-01"), ("Globex", "2026-09-03"), ("Initech", "2026-09-02")])

SORTS = {"newest": "applied_on DESC", "oldest": "applied_on", "company": "company"}

def list_applications(sort, ids):
    if sort not in SORTS:
        raise ValueError(f"Can't sort by {sort!r}; choose from {', '.join(SORTS)}")
    holes = ", ".join("?" for _ in ids)        # "?, ?, ?": only question marks, never values
    sql = f"SELECT company FROM applications WHERE id IN ({holes}) ORDER BY {SORTS[sort]}"
    return [row[0] for row in conn.execute(sql, ids)]

list_applications("newest", [1, 2, 3]), list_applications("company", [1, 3])
```

This f-string is safe because every piece it inserts is text *the program* chose: an entry from
`SORTS`, or a run of `?`. The values still go through parameters.

```quiz
question: "Which of these is safe with an untrusted `name`?"
options:
  - "conn.execute(\"SELECT * FROM customers WHERE name = '%s'\" % name)"
  - "conn.execute(\"SELECT * FROM customers WHERE name = ?\", (name,))"
  - "conn.execute(\"SELECT * FROM customers WHERE name = ?\".replace(\"?\", repr(name)))"
answer: 1
explain: "Only the second sends the value separately. The other two build SQL text from the value, however careful the quoting looks."
```

## Transactions: all or nothing

Recording a payment is two writes: insert the payment, then mark the invoice paid. If the program
crashes between them, the database says the invoice is unpaid and holds a payment for it. A
**transaction** groups statements so they take effect together or not at all:

- **commit** makes every change in the transaction permanent and visible to other connections;
- **rollback** throws every change away, as if none of it happened.

By default, `sqlite3` opens a transaction for you before the first `INSERT`, `UPDATE` or `DELETE`,
and leaves it open until you call `conn.commit()` or `conn.rollback()`. Until you commit, nobody
else can see your changes, and if the connection closes, they're gone. Here are two connections to
the same database file:

```python
import os
import sqlite3
import tempfile

path = os.path.join(tempfile.mkdtemp(), "billing.db")
writer = sqlite3.connect(path)
reader = sqlite3.connect(path)
writer.execute("CREATE TABLE payments (invoice TEXT, amount_cents INTEGER)")

writer.execute("INSERT INTO payments VALUES ('INV-0042', 125000)")
seen_before = reader.execute("SELECT count(*) FROM payments").fetchone()
open_before = writer.in_transaction

writer.commit()
seen_after = reader.execute("SELECT count(*) FROM payments").fetchone()

seen_before, open_before, seen_after, writer.in_transaction
```

Forgetting `commit()` is one of the most common database bugs there is: the program's own
connection sees its writes, so it looks fine in testing, and the data never arrives.

## The connection as a context manager

Calling `commit()` on success and `rollback()` on every error by hand is easy to get wrong. A
connection is a context manager that does it for you: `with conn:` **commits** if the block
finishes and **rolls back** if it raises, then lets the exception carry on.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE invoices (number TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE payments (invoice TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0));
    INSERT INTO invoices VALUES ('INV-0042', 'sent'), ('INV-0043', 'sent');
""")

def record_payment(number, amount_cents):
    with conn:
        conn.execute("INSERT INTO payments VALUES (?, ?)", (number, amount_cents))
        conn.execute("UPDATE invoices SET status = 'paid' WHERE number = ?", (number,))

record_payment("INV-0042", 125000)
try:
    record_payment("INV-0043", -5)          # the CHECK refuses it
except sqlite3.IntegrityError as error:
    print("Refused:", error)

conn.execute("SELECT * FROM invoices").fetchall(), conn.execute("SELECT * FROM payments").fetchall()
```

> [!WARNING]
> `with conn:` manages the **transaction**, not the connection: it doesn't close it. That's
> surprising if you expect it to work like `with open(...)`. To close as well, use
> `contextlib.closing(sqlite3.connect(path))` or call `conn.close()` yourself.

> [!TIP]
> Since Python 3.12, `sqlite3.connect(path, autocommit=False)` gives the behaviour the database API
> standard asks for: there is always a transaction open, and nothing is saved until you commit. It's
> the clearest mode for new code; the default shown here is what you'll meet in existing code.

## Isolation: what other connections see

While a transaction is open, other connections see the data **as it was** before it started. How
strictly each transaction is kept apart from the others is its **isolation level**. PostgreSQL
defaults to *read committed*, where each statement sees whatever was committed when it started;
*serializable* makes concurrent transactions behave as if they'd run one after another. SQLite
allows one writer at a time, which is simple and safe but a limit for write-heavy servers.

Isolation doesn't save you from the **lost update**: two requests both read "5 in stock", both
subtract one in Python, and both write 4. Two sales, one unit gone. The fix is to let the database
do the arithmetic and the check in **one** statement, and ask how many rows it changed:

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, on_hand INTEGER NOT NULL)")
conn.execute("INSERT INTO stock VALUES ('MUG-STN', 2)")

def take(sku, quantity):
    with conn:
        cursor = conn.execute(
            "UPDATE stock SET on_hand = on_hand - ? WHERE sku = ? AND on_hand >= ?",
            (quantity, sku, quantity),
        )
    return cursor.rowcount == 1         # 0 rows changed means not enough stock

take("MUG-STN", 1), take("MUG-STN", 1), take("MUG-STN", 1), conn.execute("SELECT on_hand FROM stock").fetchone()
```

However many requests race, each `UPDATE` reads and writes the row in one step, so stock never goes
below zero and nothing is counted twice.

## Where this leaves you

Values always travel as parameters (`?`, `:name`, or your driver's `%s`), never inside the SQL text;
the parts parameters can't cover (column names, directions, IN-lists) are chosen from a whitelist
your code controls. Writes that belong together go in one transaction: `with conn:` commits them
together or rolls them all back. Uncommitted changes are invisible to everyone else and lost on
close. And a check-and-update belongs in one SQL statement, with `rowcount` telling you whether it
happened. The drills have you fix an injectable login and a missing commit, then build an import
that's all or nothing.
