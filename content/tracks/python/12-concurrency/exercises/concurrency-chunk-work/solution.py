def chunk(items, parts):
    """Split items into `parts` contiguous chunks whose sizes differ by at most one."""
    if parts < 1:
        raise ValueError("parts must be at least 1")
    parts = min(parts, len(items))
    if parts == 0:
        return []
    base, extra = divmod(len(items), parts)
    chunks = []
    start = 0
    for index in range(parts):
        size = base + 1 if index < extra else base
        chunks.append(items[start:start + size])
        start += size
    return chunks
