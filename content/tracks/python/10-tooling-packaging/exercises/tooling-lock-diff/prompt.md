A pull request touches `uv.lock`, and the diff is 400 lines of hashes. Write
`lock_changes(old, new)`, which takes the text of the lockfile before and after and returns one line
per package that changed, sorted by package name:

- `"+ name version"` for a package that was added,
- `"- name version"` for one that was removed,
- `"~ name old -> new"` for one whose version changed (up or down).

Unchanged packages are left out. Each `[[package]]` table has a `name` and a `version` (and more
keys, which you can ignore).

```python
old = """
[[package]]
name = "certifi"
version = "2025.8.3"

[[package]]
name = "httpx"
version = "0.27.2"
"""
new = """
[[package]]
name = "httpx"
version = "0.28.1"

[[package]]
name = "idna"
version = "3.11"
"""
lock_changes(old, new)
# ["- certifi 2025.8.3", "~ httpx 0.27.2 -> 0.28.1", "+ idna 3.11"]
```

A lockfile with no packages at all has no `package` key.
