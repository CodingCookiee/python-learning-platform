A dashboard lists every service in a monorepo with one line each. Write `project_summary(text)`,
which takes the text of a `pyproject.toml` and returns its name, version, supported Python and
number of dependencies:

```python
text = """
[project]
name = "invoicer"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = ["httpx>=0.28.1", "rich>=14.0"]
"""
project_summary(text)   # "invoicer 0.1.0 (Python >=3.14, 2 dependencies)"
```

A project may have no `dependencies` key at all, which means none. Write `1 dependency` for one.
