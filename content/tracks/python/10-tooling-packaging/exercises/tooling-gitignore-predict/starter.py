from fnmatch import fnmatch

IGNORE = ["__pycache__/", "*.py[oc]", "build/", "dist/", "wheels/", "*.egg-info", ".venv"]

FILES = [
    "pyproject.toml",
    "uv.lock",
    ".python-version",
    ".venv/pyvenv.cfg",
    ".venv/lib/python3.14/site-packages/httpx/__init__.py",
    "src/invoicer/__init__.py",
    "src/invoicer/__pycache__/cli.cpython-314.pyc",
    "src/invoicer.egg-info/PKG-INFO",
    "dist/invoicer-0.1.0-py3-none-any.whl",
    "tests/test_build.py",
]


def ignored(path):
    parts = path.split("/")
    for pattern in IGNORE:
        if pattern.endswith("/"):
            # a folder pattern matches any folder on the path, but not the file itself
            if any(fnmatch(part, pattern[:-1]) for part in parts[:-1]):
                return True
        elif any(fnmatch(part, pattern) for part in parts):
            return True
    return False


committed = [path for path in FILES if not ignored(path)]
print(len(committed), "of", len(FILES), "files committed")
for path in committed:
    print(path)
