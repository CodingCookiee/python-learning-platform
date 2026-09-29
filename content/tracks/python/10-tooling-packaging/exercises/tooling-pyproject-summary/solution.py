import tomllib


def project_summary(text):
    """One line: name, version, requires-python and how many dependencies."""
    project = tomllib.loads(text)["project"]
    count = len(project.get("dependencies", []))
    noun = "dependency" if count == 1 else "dependencies"
    return f"{project['name']} {project['version']} (Python {project['requires-python']}, {count} {noun})"
