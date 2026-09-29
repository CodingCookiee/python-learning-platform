def nearest_depot(deliveries, depots):
    """For each delivery, the index of the closest depot."""
    # (n, 1, 2) minus (1, m, 2) broadcasts to (n, m, 2): every delivery against every depot
    offsets = deliveries[:, None, :] - depots[None, :, :]
    squared_distances = (offsets**2).sum(axis=2)  # (n, m)
    return squared_distances.argmin(axis=1)
