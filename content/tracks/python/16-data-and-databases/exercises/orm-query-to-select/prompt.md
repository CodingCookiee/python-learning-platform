The billing module was written for SQLAlchemy 1.3 and uses the legacy `session.query()` API. It
still runs on 2.0, but the team has agreed that new and touched code uses `select()`. Rewrite the
four functions in 2.0 style so they return exactly what they return now:

```python
[i.number for i in overdue(session, date(2026, 9, 20))]    # ["INV-003", "INV-001"]
by_number(session, "INV-002").customer                     # "Globex"
count_for(session, "Acme")                                 # 2
outstanding_by_customer(session)                           # [("Acme", 170000), ("Initech", 38000)]
```

No `session.query(...)` should be left. The `Invoice` model stays as it is.
