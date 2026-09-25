from plp import test, hidden
from solution import top_words


@test("Finds the two most common words")
def _():
    assert top_words("fast delivery fast refund Fast support", 2) == [("fast", 3), ("delivery", 1)]


@test("Ignores case")
def _():
    assert top_words("Great GREAT great", 1) == [("great", 3)]


@test("Returns every word when n is larger than the number of distinct words")
def _():
    assert top_words("slow refund", 5) == [("slow", 1), ("refund", 1)]


@hidden("Returns an empty list for empty text")
def _():
    assert top_words("", 3) == []


@hidden("Treats runs of spaces and newlines as one separator")
def _():
    assert top_words("late  parcel\nlate", 2) == [("late", 2), ("parcel", 1)]
