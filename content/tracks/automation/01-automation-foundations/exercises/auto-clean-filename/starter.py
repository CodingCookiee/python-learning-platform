import re
from pathlib import Path


def clean_filename(name):
    """Lower-case, hyphen-separated name, extension kept in lower case."""
    return name.lower().replace(" ", "-")
