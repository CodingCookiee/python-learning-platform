def tag_cloud(posts):
    """Return every distinct normalised tag across (title, tags) posts, sorted."""
    return sorted({tag.strip().lower() for title, tags in posts for tag in tags if tag.strip()})
