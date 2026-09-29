import re
import tomllib


def dependency_names(text):
    """The normalised names of the project's dependencies, sorted, without duplicates."""
    project = tomllib.loads(text)["project"]
    return sorted(dependency.split(">=")[0].lower() for dependency in project["dependencies"])
