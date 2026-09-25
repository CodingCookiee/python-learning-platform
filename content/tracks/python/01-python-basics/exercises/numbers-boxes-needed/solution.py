import math


def boxes_needed(items, per_box):
    """Return how many boxes it takes to pack items, per_box to a box. A part-full box counts."""
    return math.ceil(items / per_box)
