import json
import tempfile
from pathlib import Path

from plp import test, hidden, raises
from solution import SettingsError, load_settings, save_settings

DEFAULTS = {"currency": "EUR", "theme": "light", "receipt_footer": "Merci !"}


def settings_path():
    return Path(tempfile.mkdtemp()) / "settings.json"


@test("Saved settings load back over the defaults")
def _():
    path = settings_path()
    save_settings(path, {"shop": "Café Lumière", "theme": "dark"})
    assert load_settings(path, DEFAULTS) == {
        "currency": "EUR",
        "theme": "dark",
        "receipt_footer": "Merci !",
        "shop": "Café Lumière",
    }


@test("Writes indented, sorted, readable JSON")
def _():
    path = settings_path()
    save_settings(path, {"theme": "dark", "shop": "Café Lumière"})
    assert path.read_text(encoding="utf-8") == '{\n  "shop": "Café Lumière",\n  "theme": "dark"\n}\n'


@test("A missing file gives a copy of the defaults")
def _():
    path = settings_path()
    loaded = load_settings(path, DEFAULTS)
    assert loaded == DEFAULTS
    assert loaded is not DEFAULTS, "Return a new dict, so changing it can't change the defaults"
    assert not path.exists(), "Loading shouldn't create the file"


@test("A hand-edited file with a mistake raises SettingsError, chained to the JSON error")
def _():
    path = settings_path()
    path.write_text('{\n  "theme": "dark"\n  "currency": "GBP"\n}\n', encoding="utf-8")   # missing comma
    caught = raises(SettingsError, load_settings, path, DEFAULTS, match=r"^settings\.json is not valid JSON \(line 3\)$")
    assert type(caught.value.__cause__) is json.JSONDecodeError
    assert issubclass(SettingsError, ValueError)


@hidden("Valid JSON that isn't an object raises SettingsError")
def _():
    path = settings_path()
    path.write_text('["theme", "dark"]\n', encoding="utf-8")
    raises(SettingsError, load_settings, path, DEFAULTS, match=r"^settings\.json must contain a JSON object$")


@hidden("Loading never changes the defaults")
def _():
    path = settings_path()
    save_settings(path, {"currency": "GBP"})
    defaults = dict(DEFAULTS)
    assert load_settings(str(path), defaults)["currency"] == "GBP"
    assert defaults == DEFAULTS


@hidden("Round-trips numbers, booleans, lists and None")
def _():
    path = settings_path()
    settings = {"tax_rates": [0.2, 0.055], "print_receipts": False, "printer": None, "copies": 2}
    save_settings(path, settings)
    assert load_settings(path, {}) == settings
