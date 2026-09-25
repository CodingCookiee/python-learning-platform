A server's log folder has logs scattered through subfolders. Write `find_logs(folder)` that returns
every `.log` **file** under `folder`, at any depth, as paths relative to `folder` written with
forward slashes, sorted alphabetically.

For this folder:

```text
app.log
notes.txt
nginx/access.log
nginx/error.log
archive/2026-09/old.log
```

```python
find_logs(folder)
# ["app.log", "archive/2026-09/old.log", "nginx/access.log", "nginx/error.log"]
```

`folder` may be a string or a `Path`. A folder whose name happens to end in `.log` isn't a log file.
