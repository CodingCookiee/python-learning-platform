def describe(value):
    """Return "<value> is a <type name>", e.g. "42 is a int"."""
    return f"{value!r} is a {type(value).__name__}"
