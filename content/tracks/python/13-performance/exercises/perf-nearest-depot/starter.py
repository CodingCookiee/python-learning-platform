import numpy as np


def nearest_depot(deliveries, depots):
    """For each delivery, the index of the closest depot."""
    nearest = []
    for dx, dy in deliveries:
        best, best_distance = 0, float("inf")
        for i, (px, py) in enumerate(depots):
            distance = (dx - px) ** 2 + (dy - py) ** 2
            if distance < best_distance:
                best, best_distance = i, distance
        nearest.append(best)
    return np.array(nearest)
