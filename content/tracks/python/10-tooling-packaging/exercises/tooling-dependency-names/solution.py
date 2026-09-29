import re
import tomllib

NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")


def normalise(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def dependency_names(text):
    """The normalised names of the project's dependencies, sorted, without duplicates."""
    project = tomllib.loads(text)["project"]
    names = {normalise(NAME.match(dependency.strip()).group()) for dependency in project.get("dependencies", [])}
    return sorted(names)
