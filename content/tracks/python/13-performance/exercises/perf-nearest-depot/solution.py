import numpy as np


def nearest_depot(deliveries, depots):
    """For each delivery, the index of the closest depot."""
    offsets = deliveries[:, np.newaxis, :] - depots[np.newaxis, :, :]  # (n, m, 2)
    squared_distances = (offsets**2).sum(axis=2)  # (n, m)
    return squared_distances.argmin(axis=1)
