import re
import tomllib


def bump_version(text, part):
    """Return pyproject.toml text with [project] version bumped by part: "major", "minor" or "patch"."""
    old = tomllib.loads(text)["project"]["version"]
    major, minor, patch = (int(number) for number in old.split("."))
    if part == "major":
        major += 1
    elif part == "minor":
        minor += 1
    else:
        patch += 1
    new = f"{major}.{minor}.{patch}"
    return text.replace(old, new)
