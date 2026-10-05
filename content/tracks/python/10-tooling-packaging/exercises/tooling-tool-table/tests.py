import os
import tempfile
import tomllib

from plp import test, hidden, raises
from solution import DEFAULTS, load_settings


def toml_file(text):
    """Write text to a fresh pyproject.toml and return its path."""
    path = os.path.join(tempfile.mkdtemp(), "pyproject.toml")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return path


def with_table(body):
    return toml_file('[project]\nname = "client"\nversion = "1.0.0"\n\n[tool.invoicer]\n' + body)


def refused(body, match):
    """load_settings must raise ValueError for a [tool.invoicer] table holding body."""
    shown = "; ".join(body.strip().splitlines())
    with raises(ValueError, match=match, what=f"load_settings with [tool.invoicer] {shown}"):
        load_settings(with_table(body))


@test("pyproject.toml sets this client's settings in [tool.invoicer]")
def _():
    with open("pyproject.toml", "rb") as fh:
        data = tomllib.load(fh)
    assert "invoicer" not in data, (
        "A top-level [invoicer] table belongs to no tool. Each tool reads only its own table under "
        "[tool], the way ruff reads [tool.ruff], so this one is [tool.invoicer]."
    )
    table = data.get("tool", {}).get("invoicer")
    assert table is not None, "pyproject.toml has no [tool.invoicer] table"
    assert "due-days" not in table, "TOML keys are exact strings: the setting is due_days, with an underscore"
    assert table == {"currency": "EUR", "due_days": 14}, f"[tool.invoicer] holds {table}; it should set currency to EUR and due_days to 14"


@test("The rest of pyproject.toml is unchanged")
def _():
    with open("pyproject.toml", "rb") as fh:
        data = tomllib.load(fh)
    assert data.get("project", {}).get("name") == "invoicer", "Keep the [project] table as it was"
    assert data["project"].get("dependencies") == ["httpx>=0.27"], "Keep the project's dependencies"
    assert data.get("tool", {}).get("ruff") == {"line-length": 100}, "Keep the [tool.ruff] table"
    assert "dependency-groups" in data, "Keep the [dependency-groups] table"


@test("load_settings() reads this project's settings")
def _():
    got = load_settings()
    assert got == {"currency": "EUR", "due_days": 14, "footer": ""}, f"load_settings() returned {got!r}"


@test("Settings the table leaves out keep their defaults")
def _():
    got = load_settings(with_table('footer = "Thanks for your business"\n'))
    assert got == {"currency": "GBP", "due_days": 30, "footer": "Thanks for your business"}, f"Got {got!r}"


@test("No file, or no [tool.invoicer] table: the defaults")
def _():
    assert load_settings(os.path.join(tempfile.mkdtemp(), "missing.toml")) == DEFAULTS
    assert load_settings(toml_file('[project]\nname = "client"\n\n[tool.ruff]\nline-length = 88\n')) == DEFAULTS


@test("An unknown key is refused by name")
def _():
    refused("due-days = 14\n", r"unknown setting in \[tool\.invoicer\]: due-days")
    refused('currency = "EUR"\ncurrncy = "EUR"\n', "currncy")


@test("due_days must be a whole number of days, 1 or more")
def _():
    for bad in ("0", '"14"', "1.5", "true"):
        refused(f"due_days = {bad}\n", "due_days must be a whole number")
    assert load_settings(with_table("due_days = 1\n"))["due_days"] == 1


@test("currency must be three capital letters")
def _():
    for bad in ('"eur"', '"EURO"', "978"):
        refused(f"currency = {bad}\n", "currency must be a three-letter code")


@hidden("Other tools' tables are left alone")
def _():
    path = toml_file('[tool.ruff]\nline-length = 88\nselect = ["E"]\n\n[tool.invoicer]\ndue_days = 7\n')
    assert load_settings(path)["due_days"] == 7


@hidden("Every call returns a new dict")
def _():
    first = load_settings(os.path.join(tempfile.mkdtemp(), "missing.toml"))
    first["currency"] = "USD"
    assert DEFAULTS["currency"] == "GBP", "Changing the returned settings changed DEFAULTS; return a copy"
    assert load_settings(os.path.join(tempfile.mkdtemp(), "missing.toml"))["currency"] == "GBP"
