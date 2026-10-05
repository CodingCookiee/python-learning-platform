import re
import tomllib

DEFAULTS = {"currency": "GBP", "due_days": 30, "footer": ""}


def load_settings(path="pyproject.toml"):
    """The invoicer's settings: DEFAULTS, overridden by [tool.invoicer] in the file at path."""
    try:
        with open(path, "rb") as fh:
            data = tomllib.load(fh)
    except FileNotFoundError:
        data = {}
    table = data.get("tool", {}).get("invoicer", {})

    for key in table:
        if key not in DEFAULTS:
            raise ValueError(f"unknown setting in [tool.invoicer]: {key}")
    settings = {**DEFAULTS, **table}

    days = settings["due_days"]
    if isinstance(days, bool) or not isinstance(days, int) or days < 1:
        raise ValueError("due_days must be a whole number of days, 1 or more")
    if not isinstance(settings["currency"], str) or not re.fullmatch(r"[A-Z]{3}", settings["currency"]):
        raise ValueError("currency must be a three-letter code like GBP")
    return settings
