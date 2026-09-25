def add_tag(tag, tags=None):
    """Add tag to tags (a new list if none is given) and return the list."""
    if tags is None:
        tags = []
    if tag not in tags:
        tags.append(tag)
    return tags
