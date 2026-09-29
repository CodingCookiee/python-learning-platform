import datetime
import json
import os.path
from decimal import Decimal

from plp import test, hidden, raises
from solution import load_object


@test("Loads functions from modules and packages, with dotted attributes")
def _():
    assert load_object("json:dumps") is json.dumps
    assert load_object("os.path:join")("reports", "q3.csv") == "reports/q3.csv"
    assert load_object("datetime:date.fromisoformat")("2026-09-29") == datetime.date(2026, 9, 29)
    raises(ValueError, load_object, "json.dumps")


@test("Returns classes too")
def _():
    assert load_object("decimal:Decimal") is Decimal
    assert load_object("collections:OrderedDict").__name__ == "OrderedDict"


@test("Refuses badly formed text")
def _():
    raises(ValueError, load_object, ":dumps")
    raises(ValueError, load_object, "json:")
    raises(ValueError, load_object, "json:dumps:extra")


@hidden("Missing modules and attributes raise the usual errors")
def _():
    raises(ModuleNotFoundError, load_object, "no_such_module_for_invoices:run")
    raises(AttributeError, load_object, "json:dumpz")
    raises(AttributeError, load_object, "datetime:date.tomorrow")


@hidden("Imports the module if it isn't loaded yet")
def _():
    import sys

    sys.modules.pop("colorsys", None)
    to_hsv = load_object("colorsys:rgb_to_hsv")
    assert "colorsys" in sys.modules
    assert to_hsv(1.0, 0.0, 0.0) == (0.0, 1.0, 1.0)
    assert load_object("os.path:sep") == os.path.sep
