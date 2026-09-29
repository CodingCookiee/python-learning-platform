from pathlib import Path


def read_export(path):
    """The file's text, decoded as UTF-8, or as cp1252 if it isn't valid UTF-8."""
    data = Path(path).read_bytes()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")
