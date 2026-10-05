def slugify(title, max_length=40):
    """Turn an article title into a URL slug (see the ticket)."""
    return title.lower().replace(" ", "-")
