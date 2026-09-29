The starter has two models, `Company` and `Application`, linked by a one-to-many relationship.
Write two functions that work through a session the caller gives you:

- `add_application(session, company_name, role, applied_on)` adds an `Application` for the
  company with that name and returns it. If the company isn't in the database yet, create it; if
  it is, reuse it, so a company is never stored twice.
- `applications_at(session, company_name)` returns the roles applied for at that company, oldest
  application first, as a list of strings (empty for a company you don't know).

```python
add_application(session, "Northwind", "Backend engineer", date(2026, 9, 1))
add_application(session, "Northwind", "SRE", date(2026, 9, 9))
applications_at(session, "Northwind")      # ["Backend engineer", "SRE"]
```

**Don't commit.** The caller decides when the unit of work is done, so it can add several
applications in one transaction or roll them all back.
