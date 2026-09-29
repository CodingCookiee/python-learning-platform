from plp import test, hidden
from solution import count_routes


def expected_routes(rows, cols, closed):
    """The same count, filled in row by row."""
    table = [[0] * (cols + 1) for _ in range(rows + 1)]
    for row in range(rows + 1):
        for col in range(cols + 1):
            if (row, col) in closed:
                continue
            if row == 0 and col == 0:
                table[row][col] = 1
                continue
            table[row][col] = (table[row - 1][col] if row else 0) + (table[row][col - 1] if col else 0)
    return table[rows][cols]


ROADWORKS = {(3, 4), (7, 7), (8, 2), (12, 13), (15, 9)}
CITY_CENTRE = expected_routes(16, 16, ROADWORKS)


@test("Counts the routes on a small grid")
def _():
    assert count_routes(2, 2, closed=set()) == 6
    assert count_routes(2, 2, closed={(1, 1)}) == 2


@test("Counts a 16 x 16 city centre with roadworks in time")
def _():
    assert count_routes(16, 16, ROADWORKS) == CITY_CENTRE


@test("Different closures give different answers")
def _():
    assert count_routes(3, 3, {(1, 1)}) == 8
    assert count_routes(3, 3, {(1, 2)}) == 11
    assert count_routes(3, 3, set()) == 20


@hidden("No route when the depot or the customer is closed")
def _():
    assert count_routes(4, 4, {(0, 0)}) == 0
    assert count_routes(4, 4, {(4, 4)}) == 0


@hidden("A single street, and the depot itself")
def _():
    assert count_routes(0, 12, set()) == 1
    assert count_routes(0, 0, set()) == 1
    assert count_routes(0, 12, {(0, 5)}) == 0


@hidden("Leaves the closures alone")
def _():
    closed = {(2, 2), (5, 1)}
    assert count_routes(6, 6, closed) == expected_routes(6, 6, {(2, 2), (5, 1)})
    assert closed == {(2, 2), (5, 1)}
