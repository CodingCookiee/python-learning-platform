import inspect

from plp import test, hidden
from solution import export_csv

ROWS = [{"name": "ada", "total": 120}, {"name": "grace", "total": 95}]


@test("The options still work by keyword")
def _():
    result = export_csv(ROWS, include_header=False, delimiter=";", quote_all=True)
    assert result == '"ada";"120"\n"grace";"95"'


@test("Passing the options by position raises TypeError")
def _():
    try:
        export_csv(ROWS, False, ";", True)
    except TypeError:
        return
    raise AssertionError("export_csv(rows, False, \";\", True) should raise TypeError: make the options keyword-only")


@test("The defaults are unchanged")
def _():
    assert export_csv(ROWS) == "name,total\nada,120\ngrace,95"


@hidden("Each option on its own is keyword-only")
def _():
    params = inspect.signature(export_csv).parameters
    for name in ("include_header", "delimiter", "quote_all"):
        assert name in params, f"export_csv lost its {name} parameter"
        assert params[name].kind is inspect.Parameter.KEYWORD_ONLY, f"{name} can still be passed by position"


@hidden("rows can still be passed by position or by name")
def _():
    assert export_csv(ROWS, delimiter="|") == "name|total\nada|120\ngrace|95"
    assert export_csv(rows=[], include_header=True) == ""
