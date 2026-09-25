from collections import ChainMap

from plp import test, hidden
from solution import resolve_settings


def inputs():
    cli = {"port": None, "debug": True}
    env = {"APP_PORT": "8080", "HOME": "/home/ada", "APP_LOG_LEVEL": "info"}
    defaults = {"port": 8000, "debug": False, "workers": 2, "log_level": "warning"}
    return cli, env, defaults


@test("Command line beats environment, which beats defaults")
def _():
    settings = resolve_settings(*inputs())
    assert settings["port"] == "8080"
    assert settings["debug"] is True
    assert settings["workers"] == 2
    assert settings["log_level"] == "info"


@test("Returns a ChainMap of three layers")
def _():
    settings = resolve_settings(*inputs())
    assert isinstance(settings, ChainMap), "Return a ChainMap"
    assert len(settings.maps) == 3


@test("Leaves the given dicts unchanged")
def _():
    cli, env, defaults = inputs()
    resolve_settings(cli, env, defaults)
    assert (cli, env, defaults) == inputs()


@hidden("Setting a value changes only the command-line layer")
def _():
    cli, env, defaults = inputs()
    settings = resolve_settings(cli, env, defaults)
    settings["workers"] = 8
    assert settings["workers"] == 8
    assert defaults["workers"] == 2
    assert "workers" not in cli


@hidden("Ignores environment variables without the APP_ prefix")
def _():
    settings = resolve_settings(*inputs())
    assert "home" not in settings and "HOME" not in settings


@hidden("A flag set to False still wins over the defaults")
def _():
    settings = resolve_settings({"debug": False}, {}, {"debug": True})
    assert settings["debug"] is False
