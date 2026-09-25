from pathlib import Path


def group_by_extension(paths):
    """Return {extension: sorted file names} for a list of file paths."""
    groups = {}
    for text in paths:
        path = Path(text)
        extension = path.suffix.lower().removeprefix(".")
        groups.setdefault(extension, []).append(path.name)
    return {extension: sorted(names) for extension, names in groups.items()}
