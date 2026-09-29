import operator

# Two-character operators first, so ">=1.0" isn't read as ">" followed by "=1.0"
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


def padded(a, b):
    width = max(len(a), len(b))
    return a + (0,) * (width - len(a)), b + (0,) * (width - len(b))


def check(version, clause):
    for symbol, compare in OPERATORS.items():
        if clause.startswith(symbol):
            left, right = padded(release(version), release(clause.removeprefix(symbol)))
            return compare(left, right)
    raise ValueError(f"Unsupported clause: {clause!r}")


def satisfies(version, specifier):
    """True if version meets every clause of a specifier like ">=0.27,<1"."""
    clauses = [clause.strip() for clause in specifier.split(",") if clause.strip()]
    return all(check(version, clause) for clause in clauses)
