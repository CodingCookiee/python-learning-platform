The job tracker has three queries that run on every page load, and all three read every row of
their table:

```python
APPLICATIONS_FOR_COMPANY = "SELECT id, role FROM applications WHERE company_id = ?"
INTERVIEWS_FOR_APPLICATION = "SELECT id, scheduled_at FROM interviews WHERE application_id = ? ORDER BY scheduled_at"
RECENT_BY_STATUS = "SELECT id FROM applications WHERE status = ? AND applied_on >= ?"
```

Write two functions:

- `query_plan(conn, sql, params=())` returns the detail text of each row of `EXPLAIN QUERY PLAN`
  for that query, as a list of strings.
- `add_indexes(conn)` creates indexes so that none of the three plans contains `SCAN` or
  `TEMP B-TREE` (a temporary sort). Running it twice must not fail.

```python
query_plan(conn, APPLICATIONS_FOR_COMPANY, (7,))
# ["SCAN applications"]
add_indexes(conn)
query_plan(conn, APPLICATIONS_FOR_COMPANY, (7,))
# ["SEARCH applications USING INDEX idx_applications_company (company_id=?)"]
```

The index names are up to you. The tables:

```sql
CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
                           role TEXT NOT NULL, status TEXT NOT NULL, applied_on TEXT NOT NULL);
CREATE TABLE interviews (id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL,
                         scheduled_at TEXT NOT NULL, kind TEXT NOT NULL);
```
