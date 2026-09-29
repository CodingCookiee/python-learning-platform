import numpy as np

from plp import test, hidden
from solution import vwap

# A million trades, built once when the tests load
rng = np.random.default_rng(2026)
DAY_PRICES = 100 + rng.normal(0, 0.5, 1_000_000).cumsum() / 100
DAY_VOLUMES = rng.integers(1, 1_000, 1_000_000)
DAY_VWAP = float((DAY_PRICES * DAY_VOLUMES).sum() / DAY_VOLUMES.sum())


@test("Weights each price by its volume")
def _():
    assert round(vwap(np.array([101.2, 101.5, 101.1]), np.array([300, 100, 600])), 6) == 101.17


@test("Equal volumes give the plain average")
def _():
    assert round(vwap(np.array([10.0, 20.0, 30.0]), np.array([5, 5, 5])), 6) == 20.0


@test("Handles a million trades in time")
def _():
    assert round(vwap(DAY_PRICES, DAY_VOLUMES), 6) == round(DAY_VWAP, 6)


@hidden("Returns a float")
def _():
    assert isinstance(vwap(np.array([50.0, 51.0]), np.array([1, 3])), float)


@hidden("One trade's VWAP is its price")
def _():
    assert vwap(np.array([87.25]), np.array([400])) == 87.25
