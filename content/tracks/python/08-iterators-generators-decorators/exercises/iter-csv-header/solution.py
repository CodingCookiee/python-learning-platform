def split_header(rows):
    """Return (header, rest): the first line, and an iterator over the lines after it."""
    it = iter(rows)
    header = next(it, None)
    if header is None:
        raise ValueError("no header row")
    return header, it
