import importlib
import sys
import types
from itertools import count

from plp import test, hidden, raises
from solution import module_from_source

SPRING = """
RATE = 0.2

def discounted(price):
    return round(price * (1 - RATE), 2)
"""

_numbers = count(1)


def fresh_name(stem):
    """A module name no other test (or earlier run) has used."""
    name = f"{stem}_{next(_numbers)}"
    while name in sys.modules:
        name = f"{stem}_{next(_numbers)}"
    return name


@test("Builds a module you can import")
def _():
    sys.modules.pop("spring_rules", None)
    try:
        rules = module_from_source("spring_rules", SPRING)
        assert rules.discounted(50) == 40.0
        import spring_rules
        assert spring_rules is rules
    finally:
        sys.modules.pop("spring_rules", None)


@test("It's a real module with its own globals")
def _():
    name = fresh_name("summer_rules")
    try:
        rules = module_from_source(name, SPRING)
        assert isinstance(rules, types.ModuleType)
        assert rules.__name__ == name
        rules.RATE = 0.5
        assert rules.discounted(50) == 25.0, "Functions should read the module's own globals"
        assert importlib.import_module(name) is rules
    finally:
        sys.modules.pop(name, None)


@test("A failing module is removed from sys.modules and the error propagates")
def _():
    name = fresh_name("broken_rules")
    raises(ZeroDivisionError, module_from_source, name, "RATE = 1 / 0\n")
    assert name not in sys.modules


@hidden("The module is registered before its code runs")
def _():
    name = fresh_name("self_aware_rules")
    source = "import sys\nME = sys.modules[__name__]\nNAME = __name__\n"
    try:
        rules = module_from_source(name, source)
        assert rules.ME is rules
        assert rules.NAME == name
    finally:
        sys.modules.pop(name, None)


@hidden("An already-loaded module is left alone")
def _():
    raises(ValueError, module_from_source, "json", "print('hijacked')\n")
    import json
    assert hasattr(json, "dumps")
    name = fresh_name("autumn_rules")
    try:
        first = module_from_source(name, SPRING)
        raises(ValueError, module_from_source, name, "RATE = 0.9\n")
        assert sys.modules[name] is first
        assert first.RATE == 0.2
    finally:
        sys.modules.pop(name, None)
