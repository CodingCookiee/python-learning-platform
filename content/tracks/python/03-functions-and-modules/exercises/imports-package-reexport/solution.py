from inventory import reorder


def shopping_list(levels):
    """The items to reorder, as 'name (have n)' lines."""
    return [f"{name} (have {levels[name]})" for name in reorder(levels)]
