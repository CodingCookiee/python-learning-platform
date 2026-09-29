import builtins
import io
import tempfile
from contextlib import contextmanager
from pathlib import Path

from plp import test, hidden, raises, source_avoids, source_uses
from solution import combine_branch_totals


def branches(**totals):
    """A fresh folder with one file per branch, and an output path in it."""
    folder = Path(tempfile.mkdtemp())
    paths = []
    for branch, lines in totals.items():
        path = folder / f"{branch}.txt"
        path.write_text("".join(f"{line}\n" for line in lines), encoding="utf-8")
        paths.append(path)
    return paths, folder / "combined.txt"


@contextmanager
def tracking_open():
    """Record every file object that open() or Path.open() returns while the block runs."""
    opened = []
    real_open = builtins.open

    def recording_open(*args, **kwargs):
        file = real_open(*args, **kwargs)
        opened.append(file)
        return file

    builtins.open = io.open = recording_open
    try:
        yield opened
    finally:
        builtins.open = io.open = real_open


@test("Combines the branches day by day")
def _():
    paths, output = branches(leeds=["1200.50", "980.00", "1105.25"], york=["860.00", "910.40", "1010.00"])
    assert combine_branch_totals(paths, output) == 3
    assert output.read_text(encoding="utf-8") == "1200.50,860.00\n980.00,910.40\n1105.25,1010.00\n"


@test("Uses ExitStack, and no close() calls are left")
def _():
    assert source_uses(name="ExitStack"), "Use contextlib.ExitStack to manage the files"
    assert source_avoids(call="close"), "Let the with statement close the files: remove the close() calls"


@test("Stops at the shortest branch file")
def _():
    paths, output = branches(hull=["400.00", "410.00"], leeds=["1200.50", "980.00", "1105.25"])
    assert combine_branch_totals(paths, output) == 2
    assert output.read_text(encoding="utf-8") == "400.00,1200.50\n410.00,980.00\n"


@hidden("Closes every file it opened")
def _():
    paths, output = branches(leeds=["1200.50"], york=["860.00"], hull=["400.00"])
    with tracking_open() as opened:
        combine_branch_totals(paths, output)
    assert len(opened) >= 4, "Expected the output and three branch files to be opened"
    assert all(file.closed for file in opened), "Some files were left open"


@hidden("A missing branch file raises, and the files already opened are closed")
def _():
    paths, output = branches(leeds=["1200.50"], york=["860.00"])
    paths.insert(1, paths[0].with_name("missing.txt"))
    with tracking_open() as opened:
        raises(FileNotFoundError, combine_branch_totals, paths, output)
    assert opened, "Nothing was opened"
    assert all(file.closed for file in opened), "Files opened before the missing one were left open"


@hidden("No branch files writes an empty output")
def _():
    paths, output = branches()
    assert combine_branch_totals(paths, output) == 0
    assert output.read_text(encoding="utf-8") == ""
