import tomllib


def locked_versions(text):
    return {package["name"]: package["version"] for package in tomllib.loads(text).get("package", [])}


def lock_changes(old, new):
    """One line per added (+), removed (-) or changed (~) package, sorted by name."""
    before, after = locked_versions(old), locked_versions(new)
    changes = []
    for name in sorted(before.keys() | after.keys()):
        if name not in before:
            changes.append(f"+ {name} {after[name]}")
        elif name not in after:
            changes.append(f"- {name} {before[name]}")
        elif before[name] != after[name]:
            changes.append(f"~ {name} {before[name]} -> {after[name]}")
    return changes
