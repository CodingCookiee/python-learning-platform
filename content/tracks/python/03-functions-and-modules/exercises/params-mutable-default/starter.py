def add_tag(tag, tags=[]):
    """Add tag to tags (a new list if none is given) and return the list."""
    if tag not in tags:
        tags.append(tag)
    return tags
