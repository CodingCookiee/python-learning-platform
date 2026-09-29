import operator

OPERATORS = {
    ">=": operator.ge,
    "<=": operator.le,
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    "<": operator.lt,
}


def release(version):
    return tuple(int(part) for part in version.strip().split("."))


def pad(parts, width):
    return parts + (0,) * (width - len(parts))


def expand(clause):
    """Rewrite a ~= clause as the two clauses it stands for."""
    if not clause.startswith("~="):
        return [clause]
    parts = clause.removeprefix("~=").strip().split(".")
    if len(parts) < 2:
        raise ValueError(f"~= needs at least two parts: {clause!r}")
    return [">=" + ".".join(parts), "==" + ".".join(parts[:-1]) + ".*"]


def check(version, clause):
    for symbol, compare in OPERATORS.items():
        if not clause.startswith(symbol):
            continue
        target = clause.removeprefix(symbol).strip()
        if target.endswith(".*"):
            if symbol not in ("==", "!="):
                raise ValueError(f"Wildcards only work with == and !=: {clause!r}")
            prefix = release(target.removesuffix(".*"))
            same = pad(version, len(prefix))[: len(prefix)] == prefix
            return same if symbol == "==" else not same
        target_parts = release(target)
        width = max(len(version), len(target_parts))
        return compare(pad(version, width), pad(target_parts, width))
    raise ValueError(f"Unsupported clause: {clause!r}")


def best_match(available, specifier):
    """The newest version in available that satisfies specifier, or None."""
    clauses = [part for clause in specifier.split(",") if clause.strip() for part in expand(clause.strip())]
    matching = [text for text in available if all(check(release(text), clause) for clause in clauses)]
    return max(matching, key=release, default=None)
