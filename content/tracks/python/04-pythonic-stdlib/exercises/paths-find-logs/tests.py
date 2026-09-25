import tempfile
from pathlib import Path

from plp import test, hidden
from solution import find_logs


def make_folder(*names):
    root = Path(tempfile.mkdtemp())
    for name in names:
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("GET / 200\n", encoding="utf-8")
    return root


@test("Finds logs in the folder and its subfolders")
def _():
    root = make_folder("app.log", "notes.txt", "nginx/access.log", "nginx/error.log", "archive/2026-09/old.log")
    assert find_logs(root) == ["app.log", "archive/2026-09/old.log", "nginx/access.log", "nginx/error.log"]


@test("Accepts the folder as a string")
def _():
    root = make_folder("worker.log")
    assert find_logs(str(root)) == ["worker.log"]


@test("Returns an empty list when there are no logs")
def _():
    root = make_folder("readme.txt")
    assert find_logs(root) == []


@hidden("Skips folders whose names end in .log")
def _():
    root = make_folder("backup.log/inside.txt", "real.log")
    assert find_logs(root) == ["real.log"]


@hidden("Skips files that only contain .log in the middle of their name")
def _():
    root = make_folder("app.log.gz", "app.log")
    assert find_logs(root) == ["app.log"]
