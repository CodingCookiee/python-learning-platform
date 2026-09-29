def all_lines(*sources):
    """Every line of every source, in order, as one stream."""
    for source in sources:
        yield from source
