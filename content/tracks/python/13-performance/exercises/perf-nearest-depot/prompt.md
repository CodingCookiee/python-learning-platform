Each night the routing job assigns every delivery to its nearest depot. Positions are `(x, y)`
coordinates in kilometres on the city grid, so the nearest depot is the one with the smallest
straight-line distance (comparing squared distances gives the same answer, without a square root).

```python
depots = np.array([[0.0, 0.0], [10.0, 0.0], [5.0, 8.0]])
deliveries = np.array([[1.0, 1.0], [9.0, -1.0], [5.0, 6.0], [6.0, 1.0]])
nearest_depot(deliveries, depots).tolist()
# [0, 1, 2, 1]
```

`deliveries` has shape `(n, 2)` and `depots` has shape `(m, 2)`. The job has two nested Python
loops, and a busy night of 5 000 deliveries and 80 depots is too much for it. Vectorise
`nearest_depot` with broadcasting so a busy night runs inside the time limit. It must return a
numpy array with the index of the nearest depot for each delivery, choosing the first depot on a
tie.
