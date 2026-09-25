def url_path(*segments):
    """Return "/" followed by the segments joined with single slashes."""
    return "/" + "/".join(str(segment).strip("/") for segment in segments)
