Write `applications_per_company(conn, min_applications=0)`, which returns a list of
`(company_name, number_of_applications)` for every company with at least `min_applications`
applications, most applications first, ties by name. Companies you haven't applied to yet count,
with 0.

```python
applications_per_company(conn)
# [("Northwind", 3), ("Globex", 1), ("Hooli", 1), ("Initech", 0)]
applications_per_company(conn, min_applications=2)
# [("Northwind", 3)]
```

The tables:

```sql
CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE applications (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    role TEXT NOT NULL
);
```

One query does all of it.
