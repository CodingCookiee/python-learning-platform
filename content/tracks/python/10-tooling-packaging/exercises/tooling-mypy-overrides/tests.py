from plp import test, hidden
from solution import mypy_option

EXAMPLE = """
[tool.mypy]
strict = true
disallow_untyped_defs = true

[[tool.mypy.overrides]]
module = ["invoicer.legacy", "invoicer.legacy.*"]
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = "reportlab.*"
ignore_missing_imports = true
"""

LAYERED = """
[tool.mypy]
warn_unreachable = true

[[tool.mypy.overrides]]
module = "invoicer.billing"
warn_unreachable = true

[[tool.mypy.overrides]]
module = "invoicer.legacy.*"
warn_return_any = false

[[tool.mypy.overrides]]
module = "invoicer.*"
warn_unreachable = false
warn_return_any = true
"""


@test("Reads the example configuration")
def _():
    assert mypy_option(EXAMPLE, "invoicer.legacy.importer", "disallow_untyped_defs") is False
    assert mypy_option(EXAMPLE, "invoicer.cli", "disallow_untyped_defs") is True
    assert mypy_option(EXAMPLE, "reportlab.lib.colors", "ignore_missing_imports") is True
    assert mypy_option(EXAMPLE, "httpx", "ignore_missing_imports") is None


@test("A wildcard matches the package itself and everything under it")
def _():
    assert mypy_option(EXAMPLE, "reportlab", "ignore_missing_imports") is True
    assert mypy_option(LAYERED, "invoicer", "warn_unreachable") is False
    assert mypy_option(LAYERED, "invoicer.cli.commands", "warn_unreachable") is False


@test("An exact name beats a wildcard, wherever it is in the file")
def _():
    assert mypy_option(LAYERED, "invoicer.billing", "warn_unreachable") is True


@test("A longer wildcard beats a shorter one")
def _():
    assert mypy_option(LAYERED, "invoicer.legacy.importer", "warn_return_any") is False
    assert mypy_option(LAYERED, "invoicer.cli", "warn_return_any") is True


@hidden("A prefix without a dot isn't a match")
def _():
    assert mypy_option(LAYERED, "invoicer_tools", "warn_unreachable") is True
    assert mypy_option(EXAMPLE, "invoicer.legacyish", "disallow_untyped_defs") is True


@hidden("Overrides that don't set the option don't count")
def _():
    assert mypy_option(LAYERED, "invoicer.billing", "warn_return_any") is True


@hidden("Works without any mypy configuration")
def _():
    assert mypy_option('[project]\nname = "clock"\n', "clock", "strict") is None
