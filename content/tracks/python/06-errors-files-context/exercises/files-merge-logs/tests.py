import tempfile
from pathlib import Path

from plp import test, hidden
from solution import merge_logs


def folder_with(files):
    """A fresh folder holding {relative name: text}, and an output path outside it."""
    base = Path(tempfile.mkdtemp())
    folder = base / "logs"
    folder.mkdir()
    for name, text in files.items():
        path = folder / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return folder, base / "merged.log"


def merged_text(output):
    assert Path(output).is_file(), "merge_logs didn't create the output file"
    return Path(output).read_text(encoding="utf-8")


@test("Merges the daily logs in order, with a header for each")
def _():
    folder, output = folder_with({
        "app-2026-09-01.log": "09:00 server started\n09:05 order A1001 paid\n",
        "app-2026-09-02.log": "10:12 order A1002 refunded",
        "app-2026-09-03.log": "",
        "notes.txt": "rotate weekly\n",
    })
    assert merge_logs(folder, output) == 2
    assert merged_text(output) == (
        "== app-2026-09-01.log ==\n"
        "09:00 server started\n"
        "09:05 order A1001 paid\n"
        "== app-2026-09-02.log ==\n"
        "10:12 order A1002 refunded\n"
    )


@test("Takes the logs in name order, whatever order they were created in")
def _():
    folder, output = folder_with({"b.log": "second\n", "c.log": "third\n", "a.log": "first\n"})
    merge_logs(folder, output)
    assert merged_text(output) == "== a.log ==\nfirst\n== b.log ==\nsecond\n== c.log ==\nthird\n"


@test("Ignores logs in subfolders, and folders whose names end in .log")
def _():
    folder, output = folder_with({
        "app.log": "kept\n",
        "archive/old.log": "not merged\n",
        "backup.log/readme.txt": "a folder, not a log\n",
    })
    assert merge_logs(folder, output) == 1
    assert merged_text(output) == "== app.log ==\nkept\n"


@hidden("Keeps non-ASCII text intact, and accepts strings")
def _():
    folder, output = folder_with({"café.log": "10:00 commande payée €4.50\n"})
    assert merge_logs(str(folder), str(output)) == 1
    assert merged_text(output) == "== café.log ==\n10:00 commande payée €4.50\n"


@hidden("A folder with no logs gives an empty file")
def _():
    folder, output = folder_with({"notes.txt": "nothing here\n", "empty.log": ""})
    assert merge_logs(folder, output) == 0
    assert merged_text(output) == ""


@hidden("Replaces an existing output file")
def _():
    folder, output = folder_with({"app.log": "fresh\n"})
    output.write_text("stale contents from yesterday\n", encoding="utf-8")
    merge_logs(folder, output)
    assert merged_text(output) == "== app.log ==\nfresh\n"
