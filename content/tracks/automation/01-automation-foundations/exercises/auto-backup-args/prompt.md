The clinic's nightly job backs up its PostgreSQL database with `pg_dump`. Write
`backup_command(database, backup_dir, day)` that returns the argument list to pass to
`subprocess.run`:

```python
backup_command("clinic", "/srv/backups", date(2026, 3, 9))
# ["pg_dump", "--format=custom", "--no-owner", "--file=/srv/backups/clinic-2026-03-09.dump", "clinic"]
```

The file name is `<database>-<YYYY-MM-DD>.dump` inside `backup_dir`. Every item is a `str`, and a
folder or database name containing spaces stays inside its own item.
