def slugify(title):
    """Return title in lower case, with each run of whitespace turned into a single "-"."""
    slug = title.lower()
    slug = slug.replace("   ", " ")
    slug = slug.replace("  ", " ")
    slug = slug.strip()
    slug = slug.replace(" ", "-")
    return slug
