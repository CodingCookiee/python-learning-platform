import numpy as np
from plp import hidden, test
from solution import top_k


@test("Picks the three best of six scores")
def _():
    assert top_k([0.12, 0.81, 0.45, 0.81, 0.07, 0.66], 3) == [1, 3, 5]


@test("Ties keep their original order")
def _():
    assert top_k([0.5, 0.9, 0.5, 0.9, 0.5], 5) == [1, 3, 0, 2, 4]


@test("Works on numpy arrays and returns plain ints")
def _():
    result = top_k(np.array([-0.2, 0.3, 0.1]), 2)
    assert result == [1, 2]
    assert all(type(i) is int for i in result)


@hidden("A k larger than the list returns everything; zero or negative returns nothing")
def _():
    assert top_k([0.1, 0.4], 10) == [1, 0]
    assert top_k([0.1, 0.4], 0) == []
    assert top_k([0.1, 0.4], -3) == []
    assert top_k([], 3) == []
