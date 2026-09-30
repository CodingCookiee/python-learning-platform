LOW_STOCK = 3


def reorder(levels):
    """Names whose stock level is below LOW_STOCK, alphabetical."""
    return sorted(name for name, level in levels.items() if level < LOW_STOCK)
