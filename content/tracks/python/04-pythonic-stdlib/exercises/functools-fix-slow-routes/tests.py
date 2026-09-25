from math import comb

from plp import test, hidden, solution_source
from solution import routes


def require_cache():
    # Checked first, so an uncached version fails here instead of running for hours
    assert "cache" in solution_source(), "Cache the results with functools.cache (or lru_cache)"


@test("Counts routes on a small floor")
def _():
    assert routes(2, 2) == 6
    assert routes(2, 2, {(1, 1)}) == 2


@test("Caches its answers")
def _():
    require_cache()


@test("Plans a 30 x 30 floor quickly")
def _():
    require_cache()
    assert routes(30, 30) == comb(60, 30)


@test("Plans a 30 x 30 floor with a blocked cell passed as a set")
def _():
    require_cache()
    assert routes(30, 30, {(15, 15)}) == comb(60, 30) - comb(30, 15) ** 2


@hidden("A blocked destination has no routes")
def _():
    assert routes(3, 3, {(3, 3)}) == 0


@hidden("A single row or column has exactly one route")
def _():
    assert routes(0, 5) == 1
    assert routes(4, 0) == 1
