import math

import numpy as np
from plp import hidden, test
from solution import cosine


@test("Same direction is 1.0, right angles are 0.0")
def _():
    assert math.isclose(cosine([1.0, 2.0, 0.0], [2.0, 4.0, 0.0]), 1.0)
    assert math.isclose(cosine([1.0, 0.0], [0.0, 3.0]), 0.0, abs_tol=1e-12)


@test("Opposite directions are -1.0")
def _():
    assert math.isclose(cosine([1.0, -2.0], [-3.0, 6.0]), -1.0)


@test("Only direction counts, not length")
def _():
    assert round(cosine([1.0, 1.0, 0.0], [4.0, 3.0, 5.0]), 4) == 0.7
    assert round(cosine([1.0, 1.0, 0.0], [40.0, 30.0, 50.0]), 4) == 0.7


@test("A zero vector is similar to nothing")
def _():
    assert cosine([0.0, 0.0, 0.0], [1.0, 2.0, 3.0]) == 0.0
    assert cosine([1.0, 2.0, 3.0], [0.0, 0.0, 0.0]) == 0.0


@hidden("Returns a plain float, for lists and numpy arrays alike")
def _():
    result = cosine(np.array([0.6, 0.8]), np.array([0.8, 0.6]))
    assert type(result) is float
    assert round(result, 4) == 0.96
    assert type(cosine([1, 0], [1, 0])) is float
