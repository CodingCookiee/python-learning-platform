Before `uv publish` runs in CI, a check stops releases that would fail or embarrass you. Write
`release_problems(text, tag, published)`:

- `text` is the `pyproject.toml`,
- `tag` is the git tag being released, such as `"v0.2.0"`,
- `published` is the list of versions already on PyPI, such as `["0.1.0", "0.1.1"]`.

Return a list of problems, in this order, or `[]` if there are none:

1. `missing project.<field>` for each of `name`, `version`, `description`, `readme`,
   `requires-python` and `license` that's missing from `[project]`, in that order.
2. `description is still the uv placeholder` if it's `"Add your description here"`.
3. `version 0.2 isn't MAJOR.MINOR.PATCH` if the version isn't three whole numbers. If so (or if
   it's missing), skip checks 4 to 6, which need a version.
4. `version 0.1.1 is already on PyPI` if it's in `published`.
5. Otherwise, `version 0.1.0 isn't newer than 0.1.1` if a published version is higher (compare
   numerically, and name the highest one).
6. `tag v0.2 doesn't match version 0.2.0` if the tag isn't `"v"` followed by the version.
7. `no [project.scripts] entry point` if the project has no commands (this is a CLI tool).
8. `no [build-system] table` if it's missing.

```python
text = """
[project]
name = "worklog-ada"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"

[project.scripts]
worklog = "worklog.cli:main"
"""
release_problems(text, "v0.1.0", ["0.1.0"])
# ["missing project.license",
#  "description is still the uv placeholder",
#  "version 0.1.0 is already on PyPI",
#  "no [build-system] table"]
```
