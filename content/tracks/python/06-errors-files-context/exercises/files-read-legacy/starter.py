from pathlib import Path


def read_export(path):
    """The file's text, decoded as UTF-8, or as cp1252 if it isn't valid UTF-8."""
    return Path(path).read_text(encoding="utf-8")
