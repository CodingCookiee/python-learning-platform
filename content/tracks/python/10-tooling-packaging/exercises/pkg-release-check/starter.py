import re
import tomllib

REQUIRED = ["name", "version", "description", "readme", "requires-python", "license"]
PLACEHOLDER = "Add your description here"


def release_problems(text, tag, published):
    """Everything that should stop this release, in the order the checks are listed."""
    ...
