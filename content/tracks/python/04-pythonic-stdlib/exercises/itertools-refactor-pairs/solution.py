from itertools import pairwise, product


def gaps(timestamps):
    """Seconds between each visit and the next: [0, 30, 45] -> [30, 15]."""
    return [later - earlier for earlier, later in pairwise(timestamps)]


def variants(sizes, colours):
    """Every size-colour SKU: ["S-red", "S-blue", "M-red", ...]."""
    return [f"{size}-{colour}" for size, colour in product(sizes, colours)]
