Your job-search database has an `applications` table:

```sql
CREATE TABLE applications (
    id         INTEGER PRIMARY KEY,
    company    TEXT NOT NULL,
    role       TEXT NOT NULL,
    status     TEXT NOT NULL,   -- 'applied', 'interview', 'offer' or 'rejected'
    applied_on TEXT NOT NULL    -- ISO date, like '2026-09-01'
)
```

Write `open_applications(conn)`, which takes a `sqlite3` connection and returns the applications
that are still waiting on a decision (status `'applied'` or `'interview'`), as a list of
`(company, role)` tuples. Oldest application first; if two were sent on the same day, sort them by
company.

```python
open_applications(conn)
# [("Northwind", "Backend engineer"), ("Globex", "Data engineer"), ("Umbrella", "Platform engineer")]
```

Let the database do the filtering and sorting: one query, no Python loop.
