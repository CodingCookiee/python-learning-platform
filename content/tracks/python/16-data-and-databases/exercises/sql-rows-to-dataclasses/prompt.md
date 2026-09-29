The rest of the job tracker works with `Application` dataclasses, not tuples. The starter defines
the dataclass; write the two functions that load it from this table:

```sql
CREATE TABLE applications (
    id         INTEGER PRIMARY KEY,
    applied_on TEXT NOT NULL,
    company    TEXT NOT NULL,
    role       TEXT NOT NULL,
    status     TEXT NOT NULL
)
```

- `find_applications(conn, status)` returns a list of `Application` with that status, newest
  first, ties broken by id.
- `get_application(conn, application_id)` returns the `Application` with that id, or `None`.

```python
find_applications(conn, "applied")
# [Application(id=3, company='Umbrella', role='Platform engineer', status='applied', applied_on='2026-09-08'),
#  Application(id=2, company='Globex', role='Data engineer', status='applied', applied_on='2026-09-03')]
get_application(conn, 99)     # None
```

The table's columns are in a different order from the dataclass fields. Other code shares the
connection, so don't change `conn.row_factory`.
