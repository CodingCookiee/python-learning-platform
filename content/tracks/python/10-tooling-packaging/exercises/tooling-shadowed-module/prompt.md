A learner's script says `import random`, and `random.choice` is suddenly missing. The reason is a
file they wrote themselves. Write `resolve_import(name, search_path, listing)` that works out which
file an `import` would load, the way Python's path finder does:

- `search_path` is a list of folders, like `sys.path`. Folders are searched in order and the
  **first** match wins.
- `listing` maps a folder to the set of files inside it, as paths relative to that folder, such as
  `{"random.py", "invoicer/__init__.py", "invoicer/cli.py"}`. A folder missing from `listing` is
  empty.
- In each folder, a **package** (`name/__init__.py`) is checked before a **module** (`name.py`).
- A dotted name like `invoicer.cli` first finds `invoicer`, which must be a package, then looks for
  `cli/__init__.py` or `cli.py` inside that package's folder only.

Return the full path of the file, `f"{folder}/{relative path}"`, or `None` if nothing matches.

```python
search_path = ["/home/ada/lottery", "/usr/lib/python3.14"]
listing = {
    "/home/ada/lottery": {"main.py", "random.py"},
    "/usr/lib/python3.14": {"random.py", "json/__init__.py", "json/decoder.py"},
}
resolve_import("random", search_path, listing)        # "/home/ada/lottery/random.py"
resolve_import("json.decoder", search_path, listing)  # "/usr/lib/python3.14/json/decoder.py"
```
