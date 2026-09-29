Alembic's autogenerate compares what your models describe (the `MetaData`) with what the live
database contains. Write the core of that comparison: `schema_diff(engine, metadata)` returns a
sorted list of the changes a migration would need, as strings:

| Change | String |
|--------|--------|
| A table in the metadata but not the database | `"add table interviews"` |
| A table in the database but not the metadata | `"drop table legacy_notes"` |
| A column in the metadata's table but not the database's | `"add column applications.salary"` |
| A column in the database's table but not the metadata's | `"drop column applications.notes"` |

Ignore the `alembic_version` table, which belongs to Alembic. An up-to-date database gives `[]`.

```python
schema_diff(engine, Base.metadata)
# ["add column applications.salary", "add table interviews", "drop column applications.notes",
#  "drop table legacy_notes"]
```

(Real autogenerate also compares types, nullability, indexes and foreign keys. Names are enough to
see why it can't recognise a rename: a renamed column shows up as one drop and one add.)
