def environment_label(prefix, base_prefix):
    """Describe the environment that sys.prefix and sys.base_prefix came from."""
    if prefix != base_prefix:
        return f"virtual environment at {prefix}"
    return f"system Python at {prefix}"
