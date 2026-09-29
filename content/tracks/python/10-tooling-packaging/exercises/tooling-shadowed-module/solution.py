def find_in(folder, name, listing):
    """The file for name directly inside folder: a package first, then a module."""
    files = listing.get(folder, set())
    for candidate in (f"{name}/__init__.py", f"{name}.py"):
        if candidate in files:
            return candidate
    return None


def resolve_import(name, search_path, listing):
    """The file that `import name` would load, or None."""
    first, *rest = name.split(".")
    for folder in search_path:
        found = find_in(folder, first, listing)
        if found is not None:
            break
    else:
        return None

    # Submodules are only looked for inside the package that was found
    for part in rest:
        if not found.endswith("__init__.py"):
            return None  # a plain module can't contain submodules
        package_dir = found.removesuffix("/__init__.py")
        inner = find_in(folder, f"{package_dir}/{part}", listing)
        if inner is None:
            return None
        found = inner
    return f"{folder}/{found}"
