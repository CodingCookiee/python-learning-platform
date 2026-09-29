Write `migrate(conn, migrations)`, which brings a SQLite database up to date. `migrations` is a
list, oldest first; each migration is a list of SQL statements. Migration 1 is `migrations[0]`,
migration 2 is `migrations[1]`, and so on. The database's `PRAGMA user_version` records the number
of the last migration it has had (a new database is at 0).

- Run every migration the database hasn't had yet, in order, and return how many ran.
- Each migration runs in its own transaction, together with the update to `user_version`. If any
  statement in a migration fails, that migration leaves no trace, the error propagates, and the
  database stays at the version of the last migration that succeeded.
- If the database is at a higher version than the list knows about (someone ran newer code
  against it), raise `RuntimeError` and change nothing.

```python
MIGRATIONS = [
    ["CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)",
     "CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, role TEXT NOT NULL)"],
    ["ALTER TABLE applications ADD COLUMN salary INTEGER"],
]
migrate(conn, MIGRATIONS)     # 2
migrate(conn, MIGRATIONS)     # 0: already up to date
```
