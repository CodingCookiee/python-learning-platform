A licence checker needs the names of a project's dependencies. `dependency_names(text)` takes a
`pyproject.toml` and should return the **normalised** names, sorted, without duplicates. It only
works when every dependency is written `name>=version`:

```python
text = """
[project]
name = "invoicer"
version = "0.1.0"
dependencies = [
    "httpx>=0.28.1",
    "Pydantic[email]>=2.7,<3",
    "python_dateutil==2.9.0.post0",
    "tzdata; sys_platform == 'win32'",
    "rich ~= 14.0",
]
"""
dependency_names(text)
# ["httpx", "pydantic", "python-dateutil", "rich", "tzdata"]
```

A dependency string is the name, then optionally extras in `[...]`, a specifier with any operator,
and a marker after `;`, with spaces allowed. Package names are compared **normalised**: lowercase,
with every run of `-`, `_` and `.` turned into a single `-` (so `Python_Dateutil`,
`python.dateutil` and `python-dateutil` are one package). A project with no `dependencies` key
returns `[]`.
