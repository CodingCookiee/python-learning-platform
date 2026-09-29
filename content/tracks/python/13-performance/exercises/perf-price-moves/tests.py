import numpy as np

from plp import test, hidden
from solution import big_moves

# A full day of ticks, built once when the tests load
rng = np.random.default_rng(13)
DAY = 100 * np.exp(rng.normal(0, 0.002, 300_000).cumsum())
DAY_CHANGES = (DAY[1:] - DAY[:-1]) / DAY[:-1]
DAY_MOVES = (np.flatnonzero(np.abs(DAY_CHANGES) >= 0.005) + 1).tolist()


@test("Flags the ticks that moved by the threshold or more")
def _():
    prices = np.array([100.0, 101.0, 100.9, 98.0, 98.1])
    assert big_moves(prices, 0.01).tolist() == [1, 3]


@test("Handles a full day of 300 000 ticks in time")
def _():
    assert big_moves(DAY, 0.005).tolist() == DAY_MOVES


@test("Returns a numpy array of integers")
def _():
    moves = big_moves(np.array([50.0, 55.0, 55.0, 49.5]), 0.05)
    assert isinstance(moves, np.ndarray), f"big_moves returned a {type(moves).__name__}"
    assert moves.dtype.kind == "i", f"The indices have dtype {moves.dtype}, not an integer type"
    assert moves.tolist() == [1, 3]


@hidden("A quiet feed has no big moves")
def _():
    assert big_moves(np.array([20.0, 20.01, 20.02, 20.0]), 0.01).tolist() == []
    assert big_moves(np.array([20.0]), 0.01).tolist() == []
