import copy

from plp import test, hidden, raises
from solution import Settings


@test("Reads, assigns and remembers changes")
def _():
    settings = Settings({"currency": "GBP", "timeout": 30})
    settings.timeout = 60
    assert settings.timeout == 60
    assert settings.changed() == ["timeout"]
    assert getattr(settings, "retries", 3) == 3
    assert hasattr(settings, "debug") is False


@test("A missing setting raises AttributeError that names it")
def _():
    settings = Settings({"currency": "GBP"})
    raises(AttributeError, getattr, settings, "region", match="region")
    assert settings.currency == "GBP"


@test("Settings live in the dict, not on the instance")
def _():
    settings = Settings({"currency": "GBP"})
    settings.region = "eu-west"
    assert settings.region == "eu-west"
    assert sorted(vars(settings)) == ["_changed", "_values"]
    assert settings.changed() == ["region"]


@hidden("copy.copy gives a working copy")
def _():
    settings = Settings({"currency": "GBP", "timeout": 30})
    duplicate = copy.copy(settings)
    assert duplicate.currency == "GBP"
    assert duplicate.timeout == 30
    assert getattr(duplicate, "retries", 3) == 3


@hidden("Changes are counted once per setting and sorted")
def _():
    settings = Settings({"currency": "GBP", "timeout": 30})
    settings.timeout = 45
    settings.currency = "EUR"
    settings.timeout = 60
    assert settings.changed() == ["currency", "timeout"]
    assert Settings({"currency": "GBP"}).changed() == []
