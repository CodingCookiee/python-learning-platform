def slugify(title):
    """Return title in lower case, with each run of whitespace turned into a single "-"."""
    return "-".join(title.lower().split())
