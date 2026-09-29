from plp import test, hidden
from solution import venv_paths


@test("Builds Linux and macOS paths")
def _():
    assert venv_paths("/home/ada/invoicer/.venv", "3.14.2") == {
        "python": "/home/ada/invoicer/.venv/bin/python",
        "site_packages": "/home/ada/invoicer/.venv/lib/python3.14/site-packages",
    }


@test("Builds Windows paths")
def _():
    assert venv_paths(r"C:\Users\ada\invoicer\.venv", "3.14.2", windows=True) == {
        "python": r"C:\Users\ada\invoicer\.venv\Scripts\python.exe",
        "site_packages": r"C:\Users\ada\invoicer\.venv\Lib\site-packages",
    }


@test("Uses only the major and minor version in the folder name")
def _():
    assert venv_paths("/srv/billing/.venv", "3.13.0rc1")["site_packages"] == (
        "/srv/billing/.venv/lib/python3.13/site-packages"
    )


@hidden("Accepts a version with two parts, and a trailing slash")
def _():
    assert venv_paths("/srv/billing/.venv/", "3.12") == {
        "python": "/srv/billing/.venv/bin/python",
        "site_packages": "/srv/billing/.venv/lib/python3.12/site-packages",
    }


@hidden("Returns strings, not path objects")
def _():
    paths = venv_paths("/srv/billing/.venv", "3.14.0")
    assert [type(value).__name__ for value in paths.values()] == ["str", "str"]
