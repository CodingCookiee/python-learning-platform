Finish the `Company` model for the job tracker's `companies` table. The starter has the base class
and the primary key; add:

| Attribute | Python type | Column |
|-----------|-------------|--------|
| `name` | `str` | Required, at most 100 characters, unique |
| `website` | `str` or `None` | Optional |
| `remote_friendly` | `bool` | Required, `False` unless given |

```python
Base.metadata.create_all(engine)
with Session(engine) as session:
    session.add(Company(name="Northwind"))
    session.commit()
    company = session.get(Company, 1)
    company.name, company.website, company.remote_friendly
# ("Northwind", None, False)
```
