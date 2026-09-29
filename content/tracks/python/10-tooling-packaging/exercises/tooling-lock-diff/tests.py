from plp import test, hidden
from solution import lock_changes


def lock(**versions):
    """A small uv.lock with one [[package]] table per keyword (underscores become hyphens)."""
    tables = [
        f'[[package]]\nname = "{name.replace("_", "-")}"\nversion = "{version}"\n'
        'source = { registry = "https://pypi.org/simple" }\n'
        for name, version in versions.items()
    ]
    return 'version = 1\nrequires-python = ">=3.14"\n\n' + "\n".join(tables)


OLD = """
[[package]]
name = "certifi"
version = "2025.8.3"

[[package]]
name = "httpx"
version = "0.27.2"
"""
NEW = """
[[package]]
name = "httpx"
version = "0.28.1"

[[package]]
name = "idna"
version = "3.11"
"""


@test("Reports a removal, an upgrade and an addition")
def _():
    assert lock_changes(OLD, NEW) == ["- certifi 2025.8.3", "~ httpx 0.27.2 -> 0.28.1", "+ idna 3.11"]


@test("Leaves out packages that didn't change, and ignores other keys")
def _():
    old = lock(anyio="4.10.0", httpx="0.28.1", invoicer="0.1.0", sniffio="1.3.1")
    new = lock(anyio="4.11.0", httpx="0.28.1", invoicer="0.1.0", sniffio="1.3.1")
    assert lock_changes(old, new) == ["~ anyio 4.10.0 -> 4.11.0"]


@test("Reports downgrades too")
def _():
    assert lock_changes(lock(click="8.3.0"), lock(click="8.2.1")) == ["~ click 8.3.0 -> 8.2.1"]


@test("Identical lockfiles have no changes")
def _():
    text = lock(httpx="0.28.1", idna="3.11")
    assert lock_changes(text, text) == []


@hidden("Handles an empty lockfile on either side")
def _():
    empty = 'version = 1\nrequires-python = ">=3.14"\n'
    assert lock_changes(empty, lock(rich="14.1.0", pygments="2.19.2")) == ["+ pygments 2.19.2", "+ rich 14.1.0"]
    assert lock_changes(lock(rich="14.1.0"), empty) == ["- rich 14.1.0"]


@hidden("Sorts by name, whatever order the tables are in")
def _():
    old = lock(zipp="3.23.0", attrs="25.3.0")
    new = lock(pydantic_core="2.41.1", attrs="25.4.0")
    assert lock_changes(old, new) == ["~ attrs 25.3.0 -> 25.4.0", "+ pydantic-core 2.41.1", "- zipp 3.23.0"]
