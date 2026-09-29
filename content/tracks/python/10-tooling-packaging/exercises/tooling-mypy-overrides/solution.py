import tomllib


def specificity(pattern, module):
    """How specific a matching pattern is, or None if it doesn't match the module."""
    if pattern == module:
        return (1, len(pattern.split(".")))
    if pattern.endswith(".*"):
        prefix = pattern.removesuffix(".*")
        if module == prefix or module.startswith(prefix + "."):
            return (0, len(prefix.split(".")))
    return None


def mypy_option(text, module, option):
    """The value of a mypy option for one module, from pyproject.toml text."""
    settings = tomllib.loads(text).get("tool", {}).get("mypy", {})
    best_rank, value = None, settings.get(option)
    for override in settings.get("overrides", []):
        if option not in override:
            continue
        patterns = override["module"]
        if isinstance(patterns, str):
            patterns = [patterns]
        for pattern in patterns:
            rank = specificity(pattern, module)
            if rank is not None and (best_rank is None or rank > best_rank):
                best_rank, value = rank, override[option]
    return value
