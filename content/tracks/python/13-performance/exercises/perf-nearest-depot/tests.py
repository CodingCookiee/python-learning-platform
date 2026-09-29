import numpy as np

from plp import test, hidden
from solution import nearest_depot

# A busy night, built once when the tests load
rng = np.random.default_rng(2026)
NIGHT_DELIVERIES = rng.uniform(0, 50, size=(5_000, 2)).round(3)
DEPOTS = rng.uniform(0, 50, size=(80, 2)).round(3)
SQUARED = ((NIGHT_DELIVERIES[:, None, :] - DEPOTS[None, :, :]) ** 2).sum(axis=2)
NIGHT_NEAREST = SQUARED.argmin(axis=1).tolist()


@test("Assigns each delivery to its nearest depot")
def _():
    depots = np.array([[0.0, 0.0], [10.0, 0.0], [5.0, 8.0]])
    deliveries = np.array([[1.0, 1.0], [9.0, -1.0], [5.0, 6.0], [6.0, 1.0]])
    assert nearest_depot(deliveries, depots).tolist() == [0, 1, 2, 1]


@test("Handles a busy night of 5 000 deliveries and 80 depots in time")
def _():
    assert nearest_depot(NIGHT_DELIVERIES, DEPOTS).tolist() == NIGHT_NEAREST


@test("Chooses the first depot on a tie")
def _():
    depots = np.array([[0.0, 0.0], [4.0, 0.0], [2.0, 5.0]])
    assert nearest_depot(np.array([[2.0, 0.0], [2.0, 2.5]]), depots).tolist() == [0, 2]


@hidden("With one depot, every delivery goes there")
def _():
    result = nearest_depot(NIGHT_DELIVERIES[:10], DEPOTS[:1])
    assert isinstance(result, np.ndarray)
    assert result.tolist() == [0] * 10
