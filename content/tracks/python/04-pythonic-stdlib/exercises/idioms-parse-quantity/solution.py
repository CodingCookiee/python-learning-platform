def parse_quantity(text, default=0):
    """text as an int, or default if it isn't a whole number."""
    try:
        return int(text)
    except ValueError:
        return default
