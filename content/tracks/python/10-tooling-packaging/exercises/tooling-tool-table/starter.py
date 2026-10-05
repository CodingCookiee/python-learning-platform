import tomllib

DEFAULTS = {"currency": "GBP", "due_days": 30, "footer": ""}


def load_settings(path="pyproject.toml"):
    """The invoicer's settings: DEFAULTS, overridden by [tool.invoicer] in the file at path."""
    ...
