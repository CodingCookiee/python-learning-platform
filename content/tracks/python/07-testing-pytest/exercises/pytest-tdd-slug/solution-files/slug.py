import re


def slugify(title, max_length=40):
    """Turn an article title into a URL slug (see the ticket)."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if len(slug) > max_length:
        # One character past the limit shows whether the cut lands between words
        head = slug[: max_length + 1]
        slug = head.rsplit("-", 1)[0] if "-" in head else slug[:max_length]
    return slug or "untitled"
