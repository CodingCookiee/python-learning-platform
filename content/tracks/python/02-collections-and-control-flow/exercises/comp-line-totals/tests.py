from plp import test, hidden
from solution import line_totals


@test("Multiplies quantity by unit price for each line")
def _():
    assert line_totals([("Coffee beans", 2, 8.50), ("Oat milk", 3, 1.75)]) == [17.0, 5.25]


@test("Rounds each total to the cent")
def _():
    assert line_totals([("Tea bags", 3, 0.1), ("Biscuits", 7, 1.15)]) == [0.3, 8.05]


@test("Returns an empty list for an empty basket")
def _():
    assert line_totals([]) == []


@hidden("Keeps basket order")
def _():
    assert line_totals([("Filter papers", 1, 3.20), ("Mug", 4, 6.0), ("Beans", 1, 11.99)]) == [3.2, 24.0, 11.99]
