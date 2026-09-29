The release script bumps the version in `pyproject.toml` before building. It has to edit the text,
because `tomllib` can read TOML but not write it, and the file's comments and layout must survive.
`bump_version(text, part)` has already caused two bad releases:

- Bumping `1.4.7` with `"minor"` produced `1.5.7`. The parts after the one you bump go back to zero:
  `minor` gives `1.5.0`, `major` gives `2.0.0`, and `patch` gives `1.4.8`.
- In the monorepo below, it also changed the pin on the sibling package `invoicer-core`, and the
  `[tool.docs]` version, because they happened to be `1.4.7` too.

```toml
[project]
name = "invoicer"
version = "1.4.7"   # bumped by the release script
dependencies = ["invoicer-core==1.4.7", "httpx>=0.28"]

[tool.docs]
version = "1.4.7"
```

Fix it so that only the `version = "..."` line of the `[project]` table changes, with everything
else in the file (including that line's comment) left exactly as it was. Any `part` other than
`"major"`, `"minor"` or `"patch"` raises `ValueError`.

```python
bump_version(text, "minor")
# the same text, with version = "1.5.0"   # bumped by the release script
```
