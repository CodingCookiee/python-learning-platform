Migration 0005 was drafted by comparing the new model with the database, the way Alembic's
autogenerate works. It's meant to make two changes to the live `applications` table:

1. Rename the `company` column to `employer`, keeping every value.
2. Add a required `source` column. Existing applications whose notes mention a referral get
   `'referral'`; every other application, and any new one that doesn't say, gets `'job board'`.

As drafted, it fails on the first statement, and even if it ran it would throw away every company
name. Fix `upgrade(conn)`.

```python
upgrade(conn)
conn.execute("SELECT employer, source FROM applications ORDER BY id").fetchall()
# [("Northwind", "referral"), ("Globex", "job board"), ("Initech", "job board")]
```

The table before the migration:

```sql
CREATE TABLE applications (id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL, notes TEXT)
```
