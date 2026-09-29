import inspect

from plp import test, hidden, defined_names, source_uses
from solution import config_lines


class ConfigFile:
    """A config file read one line at a time, counting the lines read."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


@test("Keeps only the meaningful lines, stripped")
def _():
    settings = ["# shop settings", "", "  currency = GBP  ", "# tax", "vat = 20"]
    assert list(config_lines(settings)) == ["currency = GBP", "vat = 20"]


@test("config_lines is a generator function")
def _():
    assert inspect.isgeneratorfunction(config_lines), "config_lines should use yield, so calling it returns a generator"


@test("The ConfigLines class is gone")
def _():
    assert defined_names("class") == []


@test("Still reads lazily, one line at a time")
def _():
    config = ConfigFile(["# header", "", "currency = GBP", "vat = 20", "region = UK"])
    lines = config_lines(config)
    assert next(lines) == "currency = GBP"
    assert config.read == 3, f"it read {config.read} lines to find the first setting; it should read 3"


@hidden("Indented comments and whitespace-only lines are skipped too")
def _():
    settings = ["\t# indented comment", "   ", "timeout = 30", "\n"]
    assert list(config_lines(settings)) == ["timeout = 30"]


@hidden("An empty file or a file of comments yields nothing")
def _():
    assert list(config_lines([])) == []
    assert list(config_lines(["# nothing", "#"])) == []


@hidden("Uses yield")
def _():
    assert source_uses(node="Yield"), "config_lines should be written with yield"
