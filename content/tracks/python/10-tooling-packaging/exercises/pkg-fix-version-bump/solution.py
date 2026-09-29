import re
import tomllib

VERSION_LINE = re.compile(r'^(\s*version\s*=\s*")([^"]*)(".*)$')


def bumped(version, part):
    major, minor, patch = (int(number) for number in version.split("."))
    if part == "major":
        return f"{major + 1}.0.0"
    if part == "minor":
        return f"{major}.{minor + 1}.0"
    if part == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"part must be major, minor or patch, not {part!r}")


def bump_version(text, part):
    """Return pyproject.toml text with [project] version bumped by part: "major", "minor" or "patch"."""
    new = bumped(tomllib.loads(text)["project"]["version"], part)
    lines = text.splitlines(keepends=True)
    table = None
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("["):
            table = stripped
            continue
        match = VERSION_LINE.match(line)
        if table == "[project]" and match:
            lines[index] = match[1] + new + match[3] + ("\n" if line.endswith("\n") else "")
            break
    return "".join(lines)
