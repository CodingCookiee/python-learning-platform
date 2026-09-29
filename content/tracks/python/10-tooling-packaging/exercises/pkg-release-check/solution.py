import re
import tomllib

REQUIRED = ["name", "version", "description", "readme", "requires-python", "license"]
PLACEHOLDER = "Add your description here"


def release(version):
    return tuple(int(part) for part in version.split("."))


def version_problems(version, tag, published):
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        return [f"version {version} isn't MAJOR.MINOR.PATCH"]
    problems = []
    if version in published:
        problems.append(f"version {version} is already on PyPI")
    elif published:
        latest = max(published, key=release)
        if release(latest) > release(version):
            problems.append(f"version {version} isn't newer than {latest}")
    if tag != f"v{version}":
        problems.append(f"tag {tag} doesn't match version {version}")
    return problems


def release_problems(text, tag, published):
    """Everything that should stop this release, in the order the checks are listed."""
    config = tomllib.loads(text)
    project = config.get("project", {})
    problems = [f"missing project.{field}" for field in REQUIRED if field not in project]
    if project.get("description") == PLACEHOLDER:
        problems.append("description is still the uv placeholder")
    if "version" in project:
        problems += version_problems(project["version"], tag, published)
    if not project.get("scripts"):
        problems.append("no [project.scripts] entry point")
    if "build-system" not in config:
        problems.append("no [build-system] table")
    return problems
