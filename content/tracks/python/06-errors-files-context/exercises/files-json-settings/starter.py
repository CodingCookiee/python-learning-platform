import json
from pathlib import Path


class SettingsError(ValueError):
    """The settings file exists but can't be used."""


def save_settings(path, settings):
    """Write settings to path as readable UTF-8 JSON."""
    ...


def load_settings(path, defaults):
    """A new dict: defaults, overridden by the settings saved at path."""
    ...
