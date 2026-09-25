import math


def boxes_needed(items, per_box):
    """Return how many boxes of per_box items are needed to pack items (rounding up)."""
    return math.ceil(items / per_box)
