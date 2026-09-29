import re
from pathlib import Path


def clean_filename(name):
    """Lower-case, hyphen-separated name, extension kept in lower case."""
    path = Path(name.strip())
    stem = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")
    return stem + path.suffix.lower()
