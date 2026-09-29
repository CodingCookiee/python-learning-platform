import json
from pathlib import Path


class SettingsError(ValueError):
    """The settings file exists but can't be used."""


def save_settings(path, settings):
    """Write settings to path as readable UTF-8 JSON."""
    with open(path, "w", encoding="utf-8") as file:
        json.dump(settings, file, indent=2, sort_keys=True, ensure_ascii=False)
        file.write("\n")


def load_settings(path, defaults):
    """A new dict: defaults, overridden by the settings saved at path."""
    name = Path(path).name
    try:
        with open(path, encoding="utf-8") as file:
            loaded = json.load(file)
    except FileNotFoundError:
        return dict(defaults)
    except json.JSONDecodeError as error:
        raise SettingsError(f"{name} is not valid JSON (line {error.lineno})") from error
    if not isinstance(loaded, dict):
        raise SettingsError(f"{name} must contain a JSON object")
    return {**defaults, **loaded}
